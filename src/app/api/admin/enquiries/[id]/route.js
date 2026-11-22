import { enquiryScope, withRef } from "@/lib/admin/enquiries";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";
import { enquiryUpdateSchema } from "@/lib/validation/enquiry";

/** The enquiry, if this admin may see it; 404 otherwise (same answer as "does not exist"). */
async function load(ctx, user) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const e = await db.enquiry.findFirst({
    where: { id, ...(await enquiryScope(user)) },
    include: { assignedTo: { select: { id: true, name: true, email: true } } },
  });
  if (!e) throw new HttpError(404);
  return e;
}

const actorName = (a) => (a ? a.name || a.email : "Website");

/** Timeline (todo 13): received, status changes, assignments and notes, oldest first. */
async function timeline(enquiryId) {
  const [logs, notes] = await Promise.all([
    db.auditLog.findMany({
      where: {
        entity: "Enquiry",
        entityId: enquiryId,
        action: { in: ["enquiry.received", "enquiry.spam", "enquiry.update"] },
      },
      orderBy: { at: "asc" },
      select: {
        id: true,
        action: true,
        diff: true,
        at: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    db.enquiryNote.findMany({
      where: { enquiryId },
      orderBy: { createdAt: "asc" },
      select: { id: true, text: true, createdAt: true, author: { select: { name: true, email: true } } },
    }),
  ]);
  return [
    ...logs.map((l) => ({
      id: l.id,
      kind: l.action === "enquiry.update" ? "change" : "received",
      at: l.at,
      by: actorName(l.actor),
      diff: l.diff,
    })),
    ...notes.map((n) => ({ id: n.id, kind: "note", at: n.createdAt, by: actorName(n.author), text: n.text })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));
}

/** GET /api/admin/enquiries/:id — the enquiry, its products, timeline and who it can be assigned to. */
export const GET = route(async (_req, ctx) => {
  const user = await requirePermission("read", "enquiries");
  const e = await load(ctx, user);
  const [products, assignees, events] = await Promise.all([
    db.product.findMany({
      where: { id: { in: e.productIds } },
      select: { id: true, name: true, slug: true, deletedAt: true, category: { select: { slug: true } } },
    }),
    db.adminUser.findMany({
      where: { status: "ACTIVE", role: { in: ["EDITOR", "SUPER_ADMIN"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    timeline(e.id),
  ]);
  return json({ ok: true, enquiry: withRef(e), products, assignees, timeline: events });
});

/** PATCH /api/admin/enquiries/:id { status?, assignedToId? } — work the enquiry (editor and up). */
export const PATCH = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "enquiries");
  const before = await load(ctx, user);
  const data = await readJson(req, enquiryUpdateSchema);
  if (data.assignedToId) {
    const assignee = await db.adminUser.findFirst({
      where: { id: data.assignedToId, status: "ACTIVE", role: { in: ["EDITOR", "SUPER_ADMIN"] } },
      select: { id: true },
    });
    if (!assignee) throw new HttpError(400, "That person cannot be assigned enquiries.");
  }
  const change = {};
  if (data.status && data.status !== before.status) change.status = [before.status, data.status];
  if (data.assignedToId !== undefined && data.assignedToId !== before.assignedToId)
    change.assignedTo = [before.assignedTo?.name ?? null, data.assignedToId];
  if (!Object.keys(change).length) return json({ ok: true, unchanged: true });

  await db.enquiry.update({
    where: { id: before.id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.assignedToId !== undefined ? { assignedToId: data.assignedToId } : {}),
    },
  });
  if (change.assignedTo && data.assignedToId) {
    const who = await db.adminUser.findUnique({
      where: { id: data.assignedToId },
      select: { name: true, email: true },
    });
    change.assignedTo = [before.assignedTo ? actorName(before.assignedTo) : null, actorName(who)];
  }
  await audit({
    actorId: user.id,
    action: "enquiry.update",
    entity: "Enquiry",
    entityId: before.id,
    diff: change,
  });
  return json({ ok: true });
});
