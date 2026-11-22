import QRCode from "qrcode";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { open, seal } from "@/lib/auth/secretBox";
import { generateTotpSecret, otpauthUri } from "@/lib/auth/totp";
import { db } from "@/lib/db";
import { assertSameOrigin, errorResponse, HttpError, json, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rateLimit";

const PENDING_REUSE_MS = 10 * 60 * 1000;

/**
 * POST /api/auth/totp/setup
 * Returns the QR code (SVG) and manual key for a pending authenticator secret.
 * - A pending secret is reused for 10 minutes, and created with an atomic conditional write,
 *   so double clicks / parallel requests always show the SAME secret that is stored.
 * - Nothing is switched on here — that needs a code from the app AND an approval code sent to the
 *   default admin email (POST /api/auth/mfa/request + /confirm).
 * - Stored encrypted (AES-256-GCM, bound to the user id).
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const me = await requireAdmin({ allowSetup: true });
  if (me.mustChangePassword) throw new HttpError(403, "Change your password first.");

  const limited = await rateLimit("sensitiveUser", me.id);
  if (!limited.success) return errorResponse(429, undefined, { retryAfter: limited.retryAfter });

  const fresh = new Date(Date.now() - PENDING_REUSE_MS);
  const candidate = generateTotpSecret();
  const claimed = await db.adminUser.updateMany({
    where: {
      id: me.id,
      OR: [{ totpPendingEnc: null }, { totpPendingAt: null }, { totpPendingAt: { lt: fresh } }],
    },
    data: { totpPendingEnc: seal(candidate, me.id), totpPendingAt: new Date() },
  });

  let secret = candidate;
  if (claimed.count === 0) {
    const row = await db.adminUser.findUnique({ where: { id: me.id }, select: { totpPendingEnc: true } });
    secret = open(row.totpPendingEnc, me.id);
  } else {
    await audit({ actorId: me.id, action: "mfa.totp.setup_started" });
  }

  const uri = otpauthUri({ secret, account: me.email });
  const qrSvg = await QRCode.toString(uri, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#16201F", light: "#FFFFFF" },
  });

  return json({
    ok: true,
    qrSvg,
    manualKey: secret.match(/.{1,4}/g).join(" "),
    account: me.email,
    issuer: "Global India",
  });
});
