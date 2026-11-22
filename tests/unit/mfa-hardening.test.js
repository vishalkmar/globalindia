import { createHash } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { isBreachedPassword } from "@/lib/auth/breached";
import { COOKIE } from "@/lib/auth/cookies";
import { signMfaTicket } from "@/lib/auth/mfaPending";
import { regenerateRecoveryCodes, useRecoveryCode } from "@/lib/auth/recovery";
import { createSession, rotateSession, SESSION_IDLE_MINUTES } from "@/lib/auth/session";
import { isFreshStepUp, STEP_UP_TTL_SECONDS, stepUpCookie } from "@/lib/auth/stepUp";
import { db } from "@/lib/db";

import { makeUser } from "../helpers.js";

/** Phase 25: breached passwords, step-up, idle timeout, MFA bypass attempts, recovery code reuse. */

const jar = new Map();
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({ get: (name) => (jar.has(name) ? { value: jar.get(name) } : undefined) }),
}));

const ORIGIN = "http://localhost:3000";
const req = (method, path, body) =>
  new Request(`${ORIGIN}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

async function signedIn(role = "SUPER_ADMIN") {
  const { user, password } = await makeUser({ role });
  const ready = await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  const s = await createSession(ready);
  return { user: ready, password, ...s };
}

describe("breached passwords (k-anonymity)", () => {
  afterAll(() => delete globalThis.__giPwnedFetch);

  it("sends only the first 5 hash characters and matches the suffix locally", async () => {
    const pw = "Correct-Horse-Battery-77";
    const sha = createHash("sha1").update(pw).digest("hex").toUpperCase();
    let asked = "";
    globalThis.__giPwnedFetch = async (url) => {
      asked = url;
      return new Response(`0000000000000000000000000000000000A:3\n${sha.slice(5)}:12\n`, { status: 200 });
    };
    expect(await isBreachedPassword(pw)).toBe(true);
    expect(asked).toBe(`https://api.pwnedpasswords.com/range/${sha.slice(0, 5)}`);
    expect(asked).not.toContain(pw);
    globalThis.__giPwnedFetch = async () => new Response("ABCDEF:1\n", { status: 200 });
    expect(await isBreachedPassword(pw)).toBe(false);
  });

  it("does not block a change when the service is down", async () => {
    globalThis.__giPwnedFetch = async () => {
      throw new Error("offline");
    };
    expect(await isBreachedPassword("Some-Unique-Pass-9182")).toBe(false);
  });

  it("the password change route refuses a breached password", async () => {
    const me = await signedIn("EDITOR");
    jar.set(COOKIE.access, me.accessToken);
    const breached = "Breached-Example-2024";
    const sha = createHash("sha1").update(breached).digest("hex").toUpperCase();
    globalThis.__giPwnedFetch = async () => new Response(`${sha.slice(5)}:99\n`, { status: 200 });
    const { POST } = await import("@/app/api/auth/password/change/route");
    const res = await POST(req("POST", "/api/auth/password/change", { currentPassword: me.password, newPassword: breached }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/data breach/);
  });
});

describe("step-up for sensitive actions", () => {
  beforeAll(() => {
    globalThis.__giSkipStepUp = false;
  });
  afterAll(() => {
    globalThis.__giSkipStepUp = true;
    jar.clear();
  });

  it("the proof is bound to the session and lasts 10 minutes", () => {
    const now = Date.now();
    const { value } = stepUpCookie("sessA", now);
    expect(isFreshStepUp(value, "sessA", now + 60_000)).toBe(true);
    expect(isFreshStepUp(value, "sessB", now + 60_000)).toBe(false);
    expect(isFreshStepUp(value, "sessA", now + (STEP_UP_TTL_SECONDS + 5) * 1000)).toBe(false);
    expect(isFreshStepUp(`${Math.floor(now / 1000)}.forged-signature-value-xx`, "sessA", now)).toBe(false);
  });

  it("a valid session alone cannot activate a theme or change security settings; the password unlocks it", async () => {
    const me = await signedIn("SUPER_ADMIN");
    jar.clear();
    jar.set(COOKIE.access, me.accessToken);
    const settings = await import("@/app/api/admin/settings/[key]/route");
    const put = () =>
      settings.PUT(req("PUT", "/api/admin/settings/uploads", { imageMaxMB: 4, pdfMaxMB: 8 }), { params: Promise.resolve({ key: "uploads" }) });
    const first = await put();
    expect(first.status).toBe(403);
    expect((await first.json()).code).toBe("step_up");

    const stepUp = await import("@/app/api/auth/step-up/route");
    expect((await stepUp.POST(req("POST", "/api/auth/step-up", { password: "wrong-password-x" }))).status).toBe(400);
    const ok = await stepUp.POST(req("POST", "/api/auth/step-up", { password: me.password }));
    expect(ok.status).toBe(200);
    const cookie = ok.cookies.get(COOKIE.stepUp);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("strict");
    jar.set(COOKIE.stepUp, cookie.value);
    expect((await put()).status).toBe(200);

    // non-security settings never ask
    jar.delete(COOKIE.stepUp);
    const header = await settings.GET(req("GET", "/api/admin/settings/header"), { params: Promise.resolve({ key: "header" }) });
    expect(header.status).toBe(200);
  });

  it("creating new recovery codes needs step-up and voids the old ones", async () => {
    const me = await signedIn("EDITOR");
    jar.clear();
    jar.set(COOKIE.access, me.accessToken);
    const old = await regenerateRecoveryCodes(me.user.id);
    const { POST } = await import("@/app/api/auth/recovery/regenerate/route");
    expect((await POST(req("POST", "/api/auth/recovery/regenerate"))).status).toBe(403);
    jar.set(COOKIE.stepUp, stepUpCookie(me.session.id).value);
    const res = await POST(req("POST", "/api/auth/recovery/regenerate"));
    const { recoveryCodes } = await res.json();
    expect(recoveryCodes).toHaveLength(10);
    expect(await useRecoveryCode(me.user.id, old[0])).toBe(false);
    expect(await useRecoveryCode(me.user.id, recoveryCodes[0])).toBe(true);
  });
});

describe("recovery codes are single use", () => {
  it("a used code never works again", async () => {
    const { user } = await makeUser();
    const codes = await regenerateRecoveryCodes(user.id);
    expect(await useRecoveryCode(user.id, codes[3])).toBe(true);
    expect(await useRecoveryCode(user.id, codes[3])).toBe(false);
    expect(await useRecoveryCode(user.id, "AAAAA-BBBBB")).toBe(false);
  });
});

describe("idle timeout", () => {
  it(`a session not refreshed for ${SESSION_IDLE_MINUTES} minutes is ended`, async () => {
    const { user } = await makeUser();
    const s = await createSession(user);
    await db.session.update({ where: { id: s.session.id }, data: { lastUsedAt: new Date(Date.now() - (SESSION_IDLE_MINUTES + 1) * 60_000) } });
    await expect(rotateSession(s.refreshToken)).rejects.toThrow();
    expect((await db.session.findUnique({ where: { id: s.session.id } })).revokedAt).not.toBeNull();
    const fresh = await createSession(user);
    await expect(rotateSession(fresh.refreshToken)).resolves.toBeTruthy();
  });
});

describe("absolute session limit", () => {
  it("a session older than 12 hours cannot be refreshed even while in use", async () => {
    const { user } = await makeUser();
    const s = await createSession(user);
    const created = await db.session.findUnique({ where: { id: s.session.id } });
    expect(Math.abs(created.absoluteExpiresAt.getTime() - created.createdAt.getTime() - 12 * 3600 * 1000)).toBeLessThan(1000);
    await db.session.update({ where: { id: s.session.id }, data: { absoluteExpiresAt: new Date(Date.now() - 1000) } });
    await expect(rotateSession(s.refreshToken)).rejects.toThrow();
  });
});

describe("MFA bypass attempts", () => {
  it("a password-only (MFA pending) ticket reaches no admin API", async () => {
    const { user } = await makeUser({ role: "SUPER_ADMIN" });
    const ticket = await signMfaTicket({ userId: user.id, tv: user.tokenVersion });
    jar.clear();
    jar.set(COOKIE.mfaPending, ticket);
    jar.set(COOKIE.access, ticket); // even placed where the access token goes
    for (const path of ["admin/users", "admin/audit", "admin/products", "auth/sessions"]) {
      const mod = await import(`@/app/api/${path}/route`);
      expect((await mod.GET(req("GET", `/api/${path}`))).status, path).toBe(401);
    }
  });

  it("an access token whose session was revoked, or whose tokenVersion is old, is refused", async () => {
    const me = await signedIn("SUPER_ADMIN");
    jar.clear();
    jar.set(COOKIE.access, me.accessToken);
    const users = await import("@/app/api/admin/users/route");
    expect((await users.GET(req("GET", "/api/admin/users"))).status).toBe(200);
    await db.adminUser.update({ where: { id: me.user.id }, data: { tokenVersion: { increment: 1 } } });
    expect((await users.GET(req("GET", "/api/admin/users"))).status).toBe(401);
  });

  it("an account that has not finished MFA setup cannot use admin APIs", async () => {
    const { user } = await makeUser({ role: "SUPER_ADMIN" }); // mfaSetupAt is null
    const s = await createSession(user);
    jar.clear();
    jar.set(COOKIE.access, s.accessToken);
    const users = await import("@/app/api/admin/users/route");
    expect((await users.GET(req("GET", "/api/admin/users"))).status).toBe(403);
  });
});

describe("the last super admin stays", () => {
  it("the count that guards demotion ignores the target and disabled accounts; nobody demotes themselves", async () => {
    const { activeSuperAdminCount } = await import("@/lib/admin/users");
    const a = await signedIn("SUPER_ADMIN");
    const b = await signedIn("SUPER_ADMIN");
    const before = await activeSuperAdminCount(a.user.id);
    await db.adminUser.update({ where: { id: b.user.id }, data: { status: "DISABLED" } });
    expect(await activeSuperAdminCount(a.user.id)).toBe(before - 1);
    jar.clear();
    jar.set(COOKIE.access, a.accessToken);
    const { PATCH } = await import("@/app/api/admin/users/[id]/route");
    const self = await PATCH(req("PATCH", "/api/admin/users/x", { role: "EDITOR" }), { params: Promise.resolve({ id: a.user.id }) });
    expect(self.status).toBe(400);
    expect((await db.adminUser.findUnique({ where: { id: a.user.id } })).role).toBe("SUPER_ADMIN");
  });
});
