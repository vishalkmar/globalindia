import "server-only";

import { errors, jwtVerify, SignJWT } from "jose";

import { authEnv, optionalEnv } from "@/lib/env";

import { randomToken } from "./crypto";

/**
 * Access tokens (Phase 4 todo 02-03, Security.md §4).
 * - HS256 only; the algorithm is pinned on verify, so alg:none and HS/RS confusion are rejected.
 * - iss, aud, exp, nbf, iat always set and checked.
 * - 10-minute lifetime. Claims: sub (user id), role, tv (tokenVersion), sid (session id), jti.
 * - Key ring with `kid`: JWT_ACCESS_SECRET is the current key; JWT_ACCESS_SECRET_PREVIOUS (optional)
 *   is still accepted for verification during a rotation window.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;
const ALG = "HS256";
const encoder = new TextEncoder();

function keyRing() {
  const ring = { current: { kid: optionalEnv("JWT_ACCESS_KID", "k1"), key: encoder.encode(authEnv.jwtSecret) } };
  const prev = optionalEnv("JWT_ACCESS_SECRET_PREVIOUS");
  if (prev) ring.previous = { kid: optionalEnv("JWT_ACCESS_KID_PREVIOUS", "k0"), key: encoder.encode(prev) };
  return ring;
}

/**
 * @param {{ sub: string, role: string, tv: number, sid: string }} claims
 */
export async function signAccessToken({ sub, role, tv, sid }) {
  const { current } = keyRing();
  return new SignJWT({ role, tv, sid })
    .setProtectedHeader({ alg: ALG, typ: "JWT", kid: current.kid })
    .setSubject(sub)
    .setIssuer(authEnv.jwtIssuer)
    .setAudience(authEnv.jwtAudience)
    .setIssuedAt()
    .setNotBefore("0s")
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .setJti(randomToken(16))
    .sign(current.key);
}

/**
 * Verify signature + every registered claim. Never use a decode-only helper for auth decisions.
 * @returns {Promise<{ sub: string, role: string, tv: number, sid: string, jti: string } | null>}
 */
export async function verifyAccessToken(token) {
  if (typeof token !== "string" || token.length < 20 || token.length > 2048) return null;
  const ring = keyRing();
  try {
    const { payload } = await jwtVerify(
      token,
      (header) => {
        if (header.kid === ring.current.kid) return ring.current.key;
        if (ring.previous && header.kid === ring.previous.kid) return ring.previous.key;
        throw new errors.JWSSignatureVerificationFailed("Unknown key id");
      },
      {
        algorithms: [ALG],
        issuer: authEnv.jwtIssuer,
        audience: authEnv.jwtAudience,
        requiredClaims: ["sub", "jti", "exp", "iat", "nbf"],
        clockTolerance: 5,
        maxTokenAge: `${ACCESS_TOKEN_TTL_SECONDS + 5}s`,
      },
    );
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string" || !Number.isInteger(payload.tv)) return null;
    if (!["SUPER_ADMIN", "EDITOR", "VIEWER"].includes(payload.role)) return null;
    return { sub: payload.sub, role: payload.role, tv: payload.tv, sid: payload.sid, jti: payload.jti };
  } catch {
    return null;
  }
}
