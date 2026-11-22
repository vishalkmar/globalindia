import { randomBytes } from "node:crypto";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { signAccessToken, verifyAccessToken } from "@/lib/auth/jwt";
import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";

import { clearMail, makeUser, sentMail } from "../helpers.js";

/** Phase 23 todos 11, 12, 17: key rotation by kid, the email-change flow, codes never leave by API. */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") && cookieJar.access ? { value: cookieJar.access } : undefined),
  }),
}));

const ORIGIN = "http://localhost:3000";
const post = (path, body) =>
  new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN, "x-forwarded-for": "203.0.113.200" },
    body: JSON.stringify(body),
  });

describe("access-token key rotation by kid", () => {
  it("old tokens keep working through the rotation window, then stop; unknown kids are refused", async () => {
    const saved = { s: process.env.JWT_ACCESS_SECRET, k: process.env.JWT_ACCESS_KID };
    const claims = { sub: "cm0000000000000000000user1", role: "EDITOR", tv: 0, sid: "cm0000000000000000000sess1" };
    try {
      process.env.JWT_ACCESS_KID = "k1";
      const old = await signAccessToken(claims);
      // rotate: current -> previous, new current
      process.env.JWT_ACCESS_SECRET_PREVIOUS = saved.s;
      process.env.JWT_ACCESS_KID_PREVIOUS = "k1";
      process.env.JWT_ACCESS_SECRET = randomBytes(64).toString("base64url");
      process.env.JWT_ACCESS_KID = "k2";
      const fresh = await signAccessToken(claims);
      expect(JSON.parse(Buffer.from(fresh.split(".")[0], "base64url")).kid).toBe("k2");
      expect(await verifyAccessToken(old)).not.toBeNull();
      expect(await verifyAccessToken(fresh)).not.toBeNull();
      // window over
      delete process.env.JWT_ACCESS_SECRET_PREVIOUS;
      delete process.env.JWT_ACCESS_KID_PREVIOUS;
      expect(await verifyAccessToken(old)).toBeNull();
      process.env.JWT_ACCESS_KID = "k9"; // token says k2, server knows only k9
      expect(await verifyAccessToken(fresh)).toBeNull();
    } finally {
      process.env.JWT_ACCESS_SECRET = saved.s;
      if (saved.k === undefined) delete process.env.JWT_ACCESS_KID;
      else process.env.JWT_ACCESS_KID = saved.k;
      delete process.env.JWT_ACCESS_SECRET_PREVIOUS;
      delete process.env.JWT_ACCESS_KID_PREVIOUS;
    }
  });
});

describe("email change: password, code to the old address, link to the new one", () => {
  let user;
  let password;
  beforeAll(async () => {
    __resetMemoryLimits();
    ({ user, password } = await makeUser());
    user = await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
    cookieJar.access = (await createSession(user)).accessToken;
  });

  it("changes the email only after all three steps, ends every session, and the link works once", async () => {
    const newEmail = `moved-${Date.now()}@test.local`;
    const start = await import("@/app/api/auth/email-change/start/route");
    const verify = await import("@/app/api/auth/email-change/verify/route");
    const confirm = await import("@/app/api/auth/email-change/confirm/route");

    expect((await start.POST(post("/api/auth/email-change/start", { newEmail, currentPassword: "wrong-password" }))).status).toBe(400);

    clearMail();
    const startRes = await start.POST(post("/api/auth/email-change/start", { newEmail, currentPassword: password }));
    const started = await startRes.json();
    expect(startRes.status).toBe(200);
    const otpMail = sentMail().find((m) => m.tags.includes("otp-email-change"));
    expect(otpMail.to).toBe(user.email); // the OLD address gets the code
    const code = otpMail.text.match(/\b(\d{6})\b/)[1];
    expect(JSON.stringify(started)).not.toContain(code); // todo 12: never in a response
    expect((await db.adminUser.findUnique({ where: { id: user.id } })).email).toBe(user.email);

    const verifyRes = await verify.POST(post("/api/auth/email-change/verify", { requestId: started.requestId, code }));
    expect(verifyRes.status).toBe(200);
    expect(JSON.stringify(await verifyRes.json())).not.toContain(code);
    const linkMail = sentMail().find((m) => m.tags.includes("email-change-confirm"));
    expect(linkMail.to).toBe(newEmail); // the NEW address gets the link
    const token = decodeURIComponent(linkMail.text.match(/token=([^\s&]+)/)[1]);

    const tvBefore = user.tokenVersion;
    expect((await confirm.POST(post("/api/auth/email-change/confirm", { token }))).status).toBe(200);
    const after = await db.adminUser.findUnique({ where: { id: user.id } });
    expect(after.email).toBe(newEmail);
    expect(after.tokenVersion).toBeGreaterThan(tvBefore);
    expect(await db.session.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);

    expect((await confirm.POST(post("/api/auth/email-change/confirm", { token }))).status).toBe(400);
  });
});
