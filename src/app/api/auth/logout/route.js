import { cookies } from "next/headers";

import { audit } from "@/lib/audit";
import { clearSessionCookies, COOKIE } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { revokeFamily, revokeSessionByToken } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertSameOrigin, json, route } from "@/lib/http";
import { clientIp, hashIp } from "@/lib/security/ip";

/**
 * POST /api/auth/logout — POST only (no logout CSRF via <img src>).
 * Revokes this device's session family in the database and clears all auth cookies.
 * Always answers 200 so the client can finish logging out even with a broken session.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const store = await cookies();
  let userId = null;

  const revoked = await revokeSessionByToken(store.get(COOKIE.refresh)?.value, "logout");
  if (revoked) userId = revoked.userId;

  const claims = await verifyAccessToken(store.get(COOKIE.access)?.value);
  if (claims) {
    userId ??= claims.sub;
    const s = await db.session.findUnique({
      where: { id: claims.sid },
      select: { familyId: true, userId: true },
    });
    if (s && s.userId === claims.sub) await revokeFamily(s.familyId, "logout");
  }

  if (userId) await audit({ actorId: userId, action: "auth.logout", ipHash: hashIp(clientIp(req.headers)) });
  return clearSessionCookies(json({ ok: true }));
});
