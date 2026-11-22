import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { COOKIE } from "@/lib/auth/cookies";
import { signMfaTicket } from "@/lib/auth/mfaPending";
import { db } from "@/lib/db";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";

import { clearMail, makeUser, sentMail } from "../helpers.js";

/** Phase 30 todo 01: the second-factor helpers, Turnstile, page guards and the role matrix table. */

const jar = new Map();
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({ get: (n) => (jar.has(n) ? { value: jar.get(n) } : undefined) }),
}));
vi.mock("next/navigation", async (orig) => ({
  ...(await orig()),
  redirect: (url) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));

beforeAll(() => __resetMemoryLimits());
afterEach(() => jar.clear());

describe("second factor helpers (lib/auth/mfa)", () => {
  it("the MFA ticket names the user only while it is valid, the account is active and unlocked", async () => {
    const { userFromMfaTicket, MFA_TICKET_EXPIRED } = await import("@/lib/auth/mfa");
    const { user } = await makeUser();
    await expect(userFromMfaTicket()).rejects.toThrow(MFA_TICKET_EXPIRED);
    jar.set(COOKIE.mfaPending, await signMfaTicket({ userId: user.id, tv: user.tokenVersion }));
    expect((await userFromMfaTicket()).id).toBe(user.id);
    await db.adminUser.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 60_000) } });
    await expect(userFromMfaTicket()).rejects.toThrow(MFA_TICKET_EXPIRED);
    await db.adminUser.update({ where: { id: user.id }, data: { lockedUntil: null, tokenVersion: { increment: 1 } } });
    await expect(userFromMfaTicket()).rejects.toThrow(MFA_TICKET_EXPIRED);
    jar.set(COOKIE.mfaPending, "garbage");
    await expect(userFromMfaTicket()).rejects.toThrow(MFA_TICKET_EXPIRED);
  });

  it("unfinished accounts go to setup after sign-in", async () => {
    const { nextPathFor } = await import("@/lib/auth/mfa");
    expect(nextPathFor({ mustChangePassword: true, mfaSetupAt: new Date() })).toBe("/admin/setup");
    expect(nextPathFor({ mustChangePassword: false, mfaSetupAt: null })).toBe("/admin/setup");
    expect(nextPathFor({ mustChangePassword: false, mfaSetupAt: new Date() })).toBe("/admin");
  });

  it("completing sign-in sets HttpOnly session cookies and records the login", async () => {
    const { completeLogin } = await import("@/lib/auth/mfa");
    const { user } = await makeUser();
    const res = await completeLogin(user, new Request("http://localhost/x", { headers: { "user-agent": "Test" } }), "email");
    expect(res.cookies.get(COOKIE.access).httpOnly).toBe(true);
    expect(res.cookies.get(COOKIE.refresh).httpOnly).toBe(true);
    expect((await db.adminUser.findUnique({ where: { id: user.id } })).lastLoginAt).not.toBeNull();
    expect(await db.auditLog.count({ where: { actorId: user.id, action: "auth.login.success" } })).toBe(1);
  });

  it("the sign-in code goes to the user's inbox and nowhere else", async () => {
    const { sendLoginOtp } = await import("@/lib/auth/mfa");
    const { user } = await makeUser();
    clearMail();
    await sendLoginOtp(user);
    const mail = sentMail().find((m) => m.tags.includes("otp-login"));
    expect(mail.to).toBe(user.email);
  });

  it("MFA changes are approved through the default admin inbox, and the address is masked", async () => {
    const { defaultAdminContact, maskEmail, requestMfaChange } = await import("@/lib/auth/mfa");
    const { user: owner } = await makeUser({ role: "SUPER_ADMIN" });
    const { user: editor } = await makeUser({ role: "EDITOR" });
    await db.siteSetting.upsert({
      where: { key: "security" },
      update: { value: { defaultAdminEmail: owner.email.toUpperCase() } },
      create: { key: "security", value: { defaultAdminEmail: owner.email.toUpperCase() } },
    });
    expect(await defaultAdminContact()).toEqual({ email: owner.email, userId: owner.id });
    clearMail();
    const r = await requestMfaChange({ actor: editor, target: editor, method: "email", enable: false });
    expect(r.sentTo).toBe(maskEmail(owner.email));
    expect(sentMail().find((m) => m.tags.includes("otp-mfa-toggle")).to).toBe(owner.email);
    await db.siteSetting.delete({ where: { key: "security" } });
    expect((await defaultAdminContact()).email).toMatch(/@/);
    expect(maskEmail("anita@gmail.com")).toBe("a****@g****.com");
    expect(maskEmail("x@y")).toBe("*@*");
  });
});

describe("Turnstile", () => {
  const saved = { fetch: globalThis.fetch };
  afterEach(() => {
    globalThis.fetch = saved.fetch;
    delete process.env.TURNSTILE_SECRET;
  });

  it("without a secret, development skips the check", async () => {
    const { verifyTurnstile } = await import("@/lib/security/turnstile");
    expect(await verifyTurnstile("x", "1.2.3.4")).toEqual({ ok: true, skipped: true });
  });

  it("with a secret, it asks Cloudflare and trusts only success: true", async () => {
    process.env.TURNSTILE_SECRET = "turnstile-secret-for-tests";
    const { verifyTurnstile, turnstileSiteKey } = await import("@/lib/security/turnstile");
    let sent;
    globalThis.fetch = async (url, init) => {
      sent = { url, body: String(init.body) };
      return new Response(JSON.stringify({ success: sent.body.includes("response=good") }));
    };
    expect((await verifyTurnstile("good", "1.2.3.4")).ok).toBe(true);
    expect(sent.url).toContain("challenges.cloudflare.com");
    expect(sent.body).toContain("remoteip=1.2.3.4");
    expect((await verifyTurnstile("bad")).ok).toBe(false);
    expect((await verifyTurnstile("")).ok).toBe(false);
    expect((await verifyTurnstile("x".repeat(3000))).ok).toBe(false);
    globalThis.fetch = async () => {
      throw new Error("down");
    };
    expect((await verifyTurnstile("good")).ok).toBe(false); // fails closed
    expect(typeof turnstileSiteKey()).toBe("string");
  });
});

describe("page guards", () => {
  async function session(role, extra = {}) {
    const { createSession } = await import("@/lib/auth/session");
    const { user } = await makeUser({ role });
    const ready = await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date(), ...extra } });
    jar.set(COOKIE.access, (await createSession(ready)).accessToken);
    return ready;
  }

  it("signed out -> login; setup pending -> setup; missing permission -> forbidden (and audited)", async () => {
    const { requireAdminPage, requirePermissionPage } = await import("@/lib/auth/guard");
    await expect(requireAdminPage({ next: "/admin/users" })).rejects.toMatchObject({ url: "/admin/login?next=%2Fadmin%2Fusers" });
    await session("EDITOR", { mustChangePassword: true });
    await expect(requireAdminPage()).rejects.toMatchObject({ url: "/admin/setup" });
    const viewer = await session("VIEWER");
    await expect(requireAdminPage({ role: "EDITOR" })).rejects.toMatchObject({ url: "/admin/forbidden" });
    await expect(requirePermissionPage("read", "users")).rejects.toMatchObject({ url: "/admin/forbidden" });
    expect(await db.auditLog.count({ where: { actorId: viewer.id, action: "authz.denied" } })).toBeGreaterThan(0);
    expect((await requirePermissionPage("read", "products")).id).toBe(viewer.id);
  });

  it("an API role check below the required role is refused and audited", async () => {
    const { requireAdmin } = await import("@/lib/auth/guard");
    const viewer = await session("VIEWER");
    await expect(requireAdmin({ role: "SUPER_ADMIN" })).rejects.toMatchObject({ status: 403 });
    expect(await db.auditLog.count({ where: { actorId: viewer.id, action: "authz.denied" } })).toBe(1);
  });
});

describe("role matrix table", () => {
  it("prints every resource and role, and denies unknown roles", async () => {
    const { matrixMarkdown, can, RESOURCES, ROLES } = await import("@/lib/auth/permissions");
    const md = matrixMarkdown();
    for (const r of ROLES) expect(md).toContain(r);
    expect(md.split("\n")).toHaveLength(Object.keys(RESOURCES).length + 2);
    expect(can({ role: "ROOT" }, "read", "users")).toBe(false);
    expect(can(null, "read", "users")).toBe(false);
  });
});
