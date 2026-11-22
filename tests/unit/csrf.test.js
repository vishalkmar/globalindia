import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { makeUser } from "../helpers.js";

/**
 * Phase 18: CSRF. These tests switch the CSRF check ON (tests/setup.js turns it off for handler tests)
 * and send requests the way a browser — or an attacker's page — would.
 */

const ORIGIN = "http://localhost:3000";
let access = "";

beforeAll(async () => {
  globalThis.__giSkipCsrf = false;
  const { user } = await makeUser({ role: "SUPER_ADMIN" });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  access = (await createSession(user)).accessToken;
});
afterAll(() => {
  globalThis.__giSkipCsrf = true;
});

vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({ get: (name) => (name.endsWith("gi_at") ? { value: access } : undefined) }),
}));

const cookieHeader = (extra = "") => `gi_at=${access}${extra ? `; ${extra}` : ""}`;
const write = (url, { token, cookie = cookieHeader(), origin = ORIGIN, type = "application/json", body = "{}" } = {}) =>
  new Request(`${ORIGIN}${url}`, {
    method: "POST",
    headers: { "content-type": type, origin, cookie, ...(token ? { "x-csrf-token": token } : {}) },
    body,
  });

async function tokenFor(cookie) {
  const route = await import("@/app/api/auth/csrf/route");
  const res = await route.GET(new Request(`${ORIGIN}/api/auth/csrf`, { headers: { cookie } }));
  const { token } = await res.json();
  return { token, setCookie: res.headers.get("set-cookie") ?? "" };
}

describe("admin writes need the session's CSRF token", () => {
  it("missing or wrong token: 403 with code csrf; right token: allowed", async () => {
    const route = await import("@/app/api/admin/cache/route");
    const missing = await route.POST(write("/api/admin/cache"));
    expect(missing.status).toBe(403);
    expect((await missing.json()).code).toBe("csrf");
    expect((await route.POST(write("/api/admin/cache", { token: "x".repeat(64) }))).status).toBe(403);
    const { token } = await tokenFor(cookieHeader());
    expect((await route.POST(write("/api/admin/cache", { token }))).status).toBe(200);
  });

  it("a token from another session does not work", async () => {
    const { user } = await makeUser({ role: "SUPER_ADMIN" });
    await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
    const other = (await createSession(user)).accessToken;
    const { token: otherToken } = await tokenFor(`gi_at=${other}`);
    const route = await import("@/app/api/admin/cache/route");
    expect((await route.POST(write("/api/admin/cache", { token: otherToken }))).status).toBe(403);
  });

  it("a cross-site HTML form (text/plain, no token, foreign origin) is refused", async () => {
    const route = await import("@/app/api/admin/redirects/route");
    const res = await route.POST(write("/api/admin/redirects", { origin: "https://evil.example", type: "text/plain", body: '{"fromPath":"/x","toPath":"/y"}' }));
    expect(res.status).toBe(403);
    expect(await db.redirect.findUnique({ where: { fromPath: "/x" } })).toBeNull();
  });

  it("reads never need a token", async () => {
    const route = await import("@/app/api/admin/redirects/route");
    const res = await route.GET(new Request(`${ORIGIN}/api/admin/redirects`, { headers: { cookie: cookieHeader() } }));
    expect(res.status).toBe(200);
  });
});

describe("login CSRF and rotation", () => {
  it("before sign-in the token is bound to an httpOnly, SameSite=Strict nonce cookie", async () => {
    const { token, setCookie } = await tokenFor("");
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(setCookie).toMatch(/gi_pre=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    const nonce = setCookie.match(/gi_pre=([^;]+)/)[1];

    const login = await import("@/app/api/auth/login/route");
    const body = JSON.stringify({ email: "nobody@example.com", password: "wrong password 123" });
    const noToken = await login.POST(write("/api/auth/login", { cookie: "", body }));
    expect(noToken.status).toBe(403);
    const withToken = await login.POST(write("/api/auth/login", { cookie: `gi_pre=${nonce}`, token, body }));
    expect(withToken.status).not.toBe(403); // reaches the login logic (wrong password -> 401)
    // the same token with a different (attacker-planted) nonce cookie fails
    const planted = await login.POST(write("/api/auth/login", { cookie: `gi_pre=${"a".repeat(43)}`, token, body }));
    expect(planted.status).toBe(403);
  });

  it("starting a session clears the pre-sign-in nonce (the old token stops working)", async () => {
    const { setSessionCookies } = await import("@/lib/auth/cookies");
    const { NextResponse } = await import("next/server");
    const res = setSessionCookies(NextResponse.json({ ok: true }), { accessToken: "a".repeat(40), refreshToken: "b".repeat(40) });
    const cookies = res.headers.getSetCookie().join("\n");
    expect(cookies).toMatch(/gi_pre=;.*Max-Age=0/i);
  });

  it("refresh and the token endpoint itself are the only exempt auth routes", async () => {
    const { needsCsrf } = await import("@/lib/security/csrf");
    const r = (path, method = "POST") => new Request(`${ORIGIN}${path}`, { method });
    expect(needsCsrf(r("/api/auth/refresh"))).toBe(false);
    expect(needsCsrf(r("/api/auth/csrf"))).toBe(false);
    expect(needsCsrf(r("/api/auth/logout"))).toBe(true);
    expect(needsCsrf(r("/api/auth/login"))).toBe(true);
    expect(needsCsrf(r("/api/admin/products", "DELETE"))).toBe(true);
    expect(needsCsrf(r("/api/admin/products", "GET"))).toBe(false);
    expect(needsCsrf(r("/api/public/enquiry"))).toBe(false); // public forms: Turnstile + Origin instead
  });
});

describe("cookie flags", () => {
  it("session cookies are HttpOnly, SameSite=Strict; production names use __Host-/__Secure-", async () => {
    const { COOKIE } = await import("@/lib/auth/cookies");
    expect(COOKIE.access).toBe("gi_at"); // dev name; production is __Host-gi_at (see cookies.js)
    const src = (await import("node:fs")).readFileSync("src/lib/auth/cookies.js", "utf8");
    expect(src).toMatch(/"__Host-gi_at"/);
    expect(src).toMatch(/"__Secure-gi_rt"/);
    expect(src).toMatch(/sameSite: "strict"/);
  });
});
