import { requirePermission } from "@/lib/auth/guard";
import { HttpError, json, route } from "@/lib/http";
import { listRevisions, REVISION_ENTITIES } from "@/lib/revisions";
import { idSchema } from "@/lib/validation/auth";

/** GET /api/admin/revisions?entity=page&entityId=... — newest 20 snapshots (metadata only). */
export const GET = route(async (req) => {
  const params = new URL(req.url).searchParams;
  const entity = params.get("entity");
  const entityId = params.get("entityId");
  // Records have cuid ids; settings and menus use their key / location as the id.
  const keyLike = ["settings", "menu", "gallery"].includes(entity) && /^[a-z_]{2,40}$/.test(entityId ?? "");
  if (!Object.hasOwn(REVISION_ENTITIES, entity ?? "") || !(keyLike || idSchema.safeParse(entityId).success))
    throw new HttpError(400);
  await requirePermission("read", REVISION_ENTITIES[entity]);
  const rows = await listRevisions(entity, entityId);
  return json({
    ok: true,
    revisions: rows.map((r) => ({
      id: r.id,
      note: r.note,
      createdAt: r.createdAt,
      author: r.author?.name || r.author?.email || "System",
    })),
  });
});
