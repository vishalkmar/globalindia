import { audit } from "@/lib/audit";
import { clearSessionCookies } from "@/lib/auth/cookies";
import { requireAdmin } from "@/lib/auth/guard";
import { revokeAllForUser } from "@/lib/auth/session";
import { assertSameOrigin, json, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";

/**
 * POST /api/auth/logout-all — signs the user out on every device.
 * Revokes all sessions and bumps tokenVersion so even unexpired access tokens stop working.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requireAdmin({ allowSetup: true });
  await revokeAllForUser(user.id, "logout_all");
  await audit({ actorId: user.id, action: "auth.logout_all", ipHash: hashIp(clientIp(req.headers)) });
  return clearSessionCookies(json({ ok: true }));
});
