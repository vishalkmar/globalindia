import "server-only";

import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { authEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

import { REFRESH_TOKEN_TTL_SECONDS } from "./cookies";
import { hmac, randomToken } from "./crypto";
import { signAccessToken } from "./jwt";

/**
 * Sessions and refresh-token rotation (Phase 4 todo 04-06).
 *
 * - Refresh token: 256-bit random, opaque. Only HMAC(token, REFRESH_PEPPER) is stored.
 * - Every refresh rotates: the old row is atomically marked revoked + replacedBy, a new row is created.
 * - Presenting a token that was already rotated or revoked = theft signal: the whole family
 *   (every token from that login) is revoked and an alert is raised.
 * - Absolute lifetime of a family: 12 hours of admin use (re-login after that; Phase 25).
 */

export const SESSION_ABSOLUTE_HOURS = 12;

export function hashRefreshToken(token) {
  return hmac(token, authEnv.refreshPepper);
}

export function newRefreshToken() {
  const token = randomToken(32);
  return { token, hash: hashRefreshToken(token) };
}

export class RefreshError extends Error {
  /** @param {"invalid"|"expired"|"reused"} reason */
  constructor(reason, userId = null) {
    super(reason);
    this.reason = reason;
    this.userId = userId;
  }
}

/**
 * Start a new login session (new family).
 * @returns {Promise<{ accessToken: string, refreshToken: string, session: object }>}
 */
export async function createSession(user, { userAgent = "", ipHash = "" } = {}) {
  const { token, hash } = newRefreshToken();
  const now = Date.now();
  const session = await db.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hash,
      familyId: randomToken(16),
      userAgent: String(userAgent).slice(0, 300),
      ipHash,
      expiresAt: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000),
      absoluteExpiresAt: new Date(now + SESSION_ABSOLUTE_HOURS * 3600 * 1000),
    },
  });
  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion,
    sid: session.id,
  });
  return { accessToken, refreshToken: token, session };
}

/**
 * Rotate a refresh token. Throws RefreshError on any problem.
 * @returns {Promise<{ accessToken: string, refreshToken: string, session: object, user: object }>}
 */
export async function rotateSession(presentedToken, { userAgent = "", ipHash = "" } = {}) {
  if (typeof presentedToken !== "string" || presentedToken.length < 30 || presentedToken.length > 100) {
    throw new RefreshError("invalid");
  }
  const hash = hashRefreshToken(presentedToken);
  const current = await db.session.findUnique({ where: { refreshTokenHash: hash }, include: { user: true } });
  if (!current) throw new RefreshError("invalid");

  // Reuse of an already rotated/revoked token -> revoke the whole family.
  if (current.revokedAt || current.replacedById) {
    await revokeFamily(current.familyId, "refresh_token_reuse");
    await audit({
      actorId: current.userId,
      action: "auth.refresh.reuse_detected",
      entity: "Session",
      entityId: current.familyId,
      ipHash,
    });
    logger.warn("auth.refresh.reuse_detected", { userId: current.userId });
    throw new RefreshError("reused", current.userId);
  }

  const now = new Date();
  if (current.expiresAt <= now || current.absoluteExpiresAt <= now) {
    await db.session.update({ where: { id: current.id }, data: { revokedAt: now, revokeReason: "expired" } });
    throw new RefreshError("expired", current.userId);
  }
  if (current.user.status !== "ACTIVE") {
    await revokeFamily(current.familyId, "user_inactive");
    throw new RefreshError("invalid", current.userId);
  }

  const { token, hash: newHash } = newRefreshToken();
  const next = await db.$transaction(async (tx) => {
    // Atomic claim: only one concurrent request can rotate this row.
    const claimed = await tx.session.updateMany({
      where: { id: current.id, revokedAt: null, replacedById: null },
      data: { revokedAt: now, revokeReason: "rotated" },
    });
    if (claimed.count !== 1) return null;
    const created = await tx.session.create({
      data: {
        userId: current.userId,
        refreshTokenHash: newHash,
        familyId: current.familyId,
        userAgent: String(userAgent || current.userAgent).slice(0, 300),
        ipHash: ipHash || current.ipHash,
        createdAt: current.createdAt, // family start, shown in the sessions list
        lastUsedAt: now,
        expiresAt: new Date(
          Math.min(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000, current.absoluteExpiresAt.getTime()),
        ),
        absoluteExpiresAt: current.absoluteExpiresAt,
      },
    });
    await tx.session.update({ where: { id: current.id }, data: { replacedById: created.id } });
    return created;
  });

  if (!next) {
    // Lost the race: the token was rotated in parallel. Treat as reuse (strict).
    await revokeFamily(current.familyId, "refresh_token_reuse");
    throw new RefreshError("reused", current.userId);
  }

  const user = current.user;
  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion,
    sid: next.id,
  });
  return { accessToken, refreshToken: token, session: next, user };
}

export async function revokeSessionByToken(presentedToken, reason = "logout") {
  if (typeof presentedToken !== "string" || !presentedToken) return null;
  const s = await db.session.findUnique({ where: { refreshTokenHash: hashRefreshToken(presentedToken) } });
  if (!s) return null;
  await revokeFamily(s.familyId, reason);
  return s;
}

export async function revokeFamily(familyId, reason) {
  return db.session.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
}

/** Revoke every session of a user and invalidate all access tokens (tokenVersion++). */
export async function revokeAllForUser(userId, reason) {
  await db.$transaction([
    db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    }),
    db.adminUser.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }),
  ]);
}

/** Whether the session behind an access token is still live (latest row of a non-revoked family). */
export async function isSessionActive(sessionId) {
  const s = await db.session.findUnique({
    where: { id: sessionId },
    select: { revokedAt: true, absoluteExpiresAt: true },
  });
  return Boolean(s && !s.revokedAt && s.absoluteExpiresAt > new Date());
}

/** Active sessions for the security page (one row per family = per device). */
export async function listActiveSessions(userId) {
  return db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, familyId: true, userAgent: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });
}
