import { beforeEach, describe, expect, it } from "vitest";

import { POST as resetConfirm } from "@/app/api/auth/reset/confirm/route";
import { POST as resetRequest } from "@/app/api/auth/reset/request/route";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, isSessionActive } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { clearMail, makeUser, sentMail } from "../helpers.js";

const ORIGIN = "http://localhost:3000";
const post = (handler, body) =>
  handler(
    new Request(`${ORIGIN}/api/x`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}`,
      },
      body: JSON.stringify(body),
    }),
  );
const flush = () => new Promise((r) => setTimeout(r, 300)); // let after() callbacks finish
const tokenFromMail = (to) => {
  const m = sentMail()
    .filter((x) => x.to === to && x.tags.includes("password-reset"))
    .at(-1);
  return m?.text.match(/token=([A-Za-z0-9_-]+)/)?.[1];
};

beforeEach(() => clearMail());

describe("password reset", () => {
  it("answers the same for known and unknown emails, and never returns a token", async () => {
    const { user } = await makeUser();
    const a = await post(resetRequest, { email: user.email });
    const b = await post(resetRequest, { email: "nobody-xyz@test.local" });
    const [ja, jb] = [await a.json(), await b.json()];
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(ja).toEqual(jb);
    await flush();
    const token = tokenFromMail(user.email);
    expect(token).toBeTruthy();
    expect(JSON.stringify(ja)).not.toContain(token);
    expect(sentMail().some((m) => m.to === "nobody-xyz@test.local")).toBe(false);
  });

  it("works once, changes the password and kills every old session", async () => {
    const { user } = await makeUser();
    const s1 = await createSession(user);
    const s2 = await createSession(user);
    await post(resetRequest, { email: user.email });
    await flush();
    const token = tokenFromMail(user.email);

    const ok = await post(resetConfirm, { token, newPassword: "Fresh-Password-2026" });
    expect(ok.status).toBe(200);
    const fresh = await db.adminUser.findUnique({ where: { id: user.id } });
    expect(await verifyPassword(fresh.passwordHash, "Fresh-Password-2026")).toBe(true);
    expect(fresh.tokenVersion).toBe(user.tokenVersion + 1);
    expect(await isSessionActive(s1.session.id)).toBe(false);
    expect(await isSessionActive(s2.session.id)).toBe(false);

    const again = await post(resetConfirm, { token, newPassword: "Another-Password-2026" });
    expect(again.status).toBe(400); // reset link works only once
  });

  it("rejects an expired link", async () => {
    const { user } = await makeUser();
    await post(resetRequest, { email: user.email });
    await flush();
    const token = tokenFromMail(user.email);
    await db.passwordResetToken.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await post(resetConfirm, { token, newPassword: "Fresh-Password-2026" });
    expect(res.status).toBe(400);
  });

  it("a newer reset link cancels the older one", async () => {
    const { user } = await makeUser();
    await post(resetRequest, { email: user.email });
    await flush();
    const first = tokenFromMail(user.email);
    await post(resetRequest, { email: user.email });
    await flush();
    const second = tokenFromMail(user.email);
    expect(second).not.toBe(first);
    expect((await post(resetConfirm, { token: first, newPassword: "Fresh-Password-2026" })).status).toBe(400);
    expect((await post(resetConfirm, { token: second, newPassword: "Fresh-Password-2026" })).status).toBe(
      200,
    );
  });

  it("refuses requests from another origin", async () => {
    const res = await resetRequest(
      new Request(`${ORIGIN}/api/x`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example" },
        body: JSON.stringify({ email: "a@b.in" }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
