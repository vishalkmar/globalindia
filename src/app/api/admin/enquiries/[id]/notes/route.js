import { enquiryScope } from "@/lib/admin/enquiries";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { idSchema } from "@/lib/validation/auth";
import { enquiryNoteSchema } from "@/lib/validation/enquiry";

/** POST /api/admin/enquiries/:id/notes { text } — internal note (never sent to the customer). */
export const POST = route(async (req, ctx) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "enquiries");
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const exists = await db.enquiry.findFirst({
    where: { id, ...(await enquiryScope(user)) },
    select: { id: true, status: true },
  });
  if (!exists) throw new HttpError(404);
  const { text } = await readJson(req, enquiryNoteSchema, { maxBytes: 8 * 1024 });
  const note = await db.enquiryNote.create({ data: { enquiryId: id, authorId: user.id, text } });
  // Someone is working on it now.
  if (exists.status === "NEW") await db.enquiry.update({ where: { id }, data: { status: "IN_PROGRESS" } });
  return json({ ok: true, id: note.id }, { status: 201 });
});
