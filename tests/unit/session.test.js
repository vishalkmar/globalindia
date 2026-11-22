import { describe, expect, it } from "vitest";

import { verifyAccessToken } from "@/lib/auth/jwt";
import {
  createSession,
  hashRefreshToken,
  isSessionActive,
  RefreshError,
  revokeAllForUser,
  rotateSession,
} from "@/lib/auth/session";
import { db } from "@/lib/db";

import { makeUser } from "../helpers.js";

describe("refresh token rotation", () => {
  it("stores only a hash of the refresh token", async () => {
    const { user } = await makeUser();
    const { refreshToken, session } = await createSession(user);
    expect(session.refreshTokenHash).toBe(hashRefreshToken(refreshToken));
    expect(session.refreshTokenHash).not.toContain(refreshToken);
    expect(refreshToken.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
  });

  it("issues new tokens on every refresh and retires the old one", async () => {
    const { user } = await makeUser();
    const first = await createSession(user);
    const second = await rotateSession(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(second.session.familyId).toBe(first.session.familyId);

    const old = await db.session.findUnique({ where: { id: first.session.id } });
    expect(old.revokedAt).not.toBeNull();
    expect(old.replacedById).toBe(second.session.id);

    const claims = await verifyAccessToken(second.accessToken);
    expect(claims.sid).toBe(second.session.id);
    expect(await isSessionActive(first.session.id)).toBe(false);
    expect(await isSessionActive(second.session.id)).toBe(true);
  });

  it("detects reuse of a rotated token and revokes the whole family", async () => {
    const { user } = await makeUser();
    const first = await createSession(user);
    const second = await rotateSession(first.refreshToken);

    await expect(rotateSession(first.refreshToken)).rejects.toMatchObject({ reason: "reused" });

    // The legitimate latest token is dead too: an attacker and the user are both signed out.
    await expect(rotateSession(second.refreshToken)).rejects.toBeInstanceOf(RefreshError);
    const live = await db.session.count({ where: { familyId: first.session.familyId, revokedAt: null } });
    expect(live).toBe(0);

    const auditRow = await db.auditLog.findFirst({
      where: { actorId: user.id, action: "auth.refresh.reuse_detected" },
    });
    expect(auditRow).not.toBeNull();
  });

  it("only one of two parallel refreshes can win", async () => {
    const { user } = await makeUser();
    const first = await createSession(user);
    const results = await Promise.allSettled([
      rotateSession(first.refreshToken),
      rotateSession(first.refreshToken),
    ]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBeLessThanOrEqual(1);
  });

  it("rejects unknown, malformed and expired tokens", async () => {
    await expect(rotateSession("x".repeat(43))).rejects.toMatchObject({ reason: "invalid" });
    await expect(rotateSession("")).rejects.toMatchObject({ reason: "invalid" });

    const { user } = await makeUser();
    const s = await createSession(user);
    await db.session.update({
      where: { id: s.session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(rotateSession(s.refreshToken)).rejects.toMatchObject({ reason: "expired" });
  });

  it("refuses to refresh for a disabled user", async () => {
    const { user } = await makeUser();
    const s = await createSession(user);
    await db.adminUser.update({ where: { id: user.id }, data: { status: "DISABLED" } });
    await expect(rotateSession(s.refreshToken)).rejects.toMatchObject({ reason: "invalid" });
  });

  it("logout-all revokes every session and bumps tokenVersion", async () => {
    const { user } = await makeUser();
    const a = await createSession(user);
    const b = await createSession(user);
    await revokeAllForUser(user.id, "test");
    const fresh = await db.adminUser.findUnique({ where: { id: user.id } });
    expect(fresh.tokenVersion).toBe(user.tokenVersion + 1);
    expect(await isSessionActive(a.session.id)).toBe(false);
    expect(await isSessionActive(b.session.id)).toBe(false);
  });
});
