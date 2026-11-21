import "server-only";

import { jwtVerify, SignJWT } from "jose";

import { authEnv } from "@/lib/env";

import { MFA_PENDING_TTL_SECONDS } from "./cookies";
import { randomToken } from "./crypto";

/**
 * "Password OK, second factor still needed" ticket.
 * Signed with its own secret and audience, so it can never be used as an access token:
 * requireAdmin() only accepts access tokens, and this ticket is only accepted by the MFA verify routes.
 */

const AUD = "gi-mfa-pending";
const ALG = "HS256";
const key = () => new TextEncoder().encode(authEnv.mfaPendingSecret);

/** @param {{ userId: string, tv: number }} p */
export async function signMfaTicket({ userId, tv }) {
  return new SignJWT({ tv })
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setSubject(userId)
    .setIssuer(authEnv.jwtIssuer)
    .setAudience(AUD)
    .setIssuedAt()
    .setExpirationTime(`${MFA_PENDING_TTL_SECONDS}s`)
    .setJti(randomToken(16))
    .sign(key());
}

/** @returns {Promise<{ userId: string, tv: number } | null>} */
export async function verifyMfaTicket(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 2048) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: [ALG],
      issuer: authEnv.jwtIssuer,
      audience: AUD,
      requiredClaims: ["sub", "exp", "jti"],
      maxTokenAge: `${MFA_PENDING_TTL_SECONDS + 5}s`,
    });
    if (!Number.isInteger(payload.tv)) return null;
    return { userId: payload.sub, tv: payload.tv };
  } catch {
    return null;
  }
}
