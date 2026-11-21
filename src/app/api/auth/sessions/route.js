import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { listActiveSessions, revokeFamily } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { deviceLabel } from "@/lib/security/ip";
import { idSchema } from "@/lib/validation/auth";

/** GET /api/auth/sessions — the signed-in admin's active devices (Phase 4 todo 17). */
export const GET = route(async () => {
  const user = await requireAdmin({ allowSetup: true });
  const sessions = await listActiveSessions(user.id);
  return json({
    ok: true,
    sessions: sessions.map((s) => ({
      id: s.id,
      device: deviceLabel(s.userAgent),
      signedInAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      current: s.id === user.sessionId,
    })),
  });
});

/** DELETE /api/auth/sessions { id } — sign out one device. Only the owner's own sessions (no IDOR). */
export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  const user = await requireAdmin({ allowSetup: true });
  const { id } = await readJson(req, z.strictObject({ id: idSchema }));
  const session = await db.session.findFirst({ where: { id, userId: user.id }, select: { familyId: true } });
  if (!session) throw new HttpError(404);
  await revokeFamily(session.familyId, "signed_out_by_user");
  await audit({ actorId: user.id, action: "auth.session.revoke", entity: "Session", entityId: id });
  return json({ ok: true });
});
