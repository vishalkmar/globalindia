import { requirePermission } from "@/lib/auth/guard";
import { HttpError, json, route } from "@/lib/http";
import { getRevision, REVISION_ENTITIES } from "@/lib/revisions";
import { idSchema } from "@/lib/validation/auth";

/** GET /api/admin/revisions/:id — one snapshot, to load into an editor. Permission follows the entity type. */
export const GET = route(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404);
  const rev = await getRevision(id);
  if (!rev || !(rev.entity in REVISION_ENTITIES)) throw new HttpError(404);
  await requirePermission("read", REVISION_ENTITIES[rev.entity]);
  return json({
    ok: true,
    revision: {
      id: rev.id,
      entity: rev.entity,
      entityId: rev.entityId,
      data: rev.data,
      createdAt: rev.createdAt,
    },
  });
});
