import { beforeEach, describe, expect, it } from "vitest";

import { LOCK_MINUTES, MAX_LOCK_MINUTES, nextLockMinutes } from "@/lib/auth/login";
import { sendEmail } from "@/lib/brevo";
import { db } from "@/lib/db";
import { isBlockedIp, resetAbuseSettings } from "@/lib/security/abuse";
import { ipInRanges, isValidRange } from "@/lib/security/ipMatch";
import { __resetMemoryLimits, LIMITS, rateLimit } from "@/lib/security/rateLimit";
import { abuseSchema } from "@/lib/settings/schemas";

import { clearMail, makeUser, sentMail } from "../helpers.js";

/** Phase 22: limits, admin-set caps, blocked IPs, email bombing, exponential lockout. */

const setAbuse = async (value) => {
  await db.siteSetting.upsert({ where: { key: "abuse" }, update: { value }, create: { key: "abuse", value } });
  resetAbuseSettings();
};

beforeEach(async () => {
  __resetMemoryLimits();
  await setAbuse({});
});

describe("limits follow the spec", () => {
  it("has the Phase 22 numbers", () => {
    expect(LIMITS.loginIp).toMatchObject({ limit: 5, windowSec: 900 });
    expect(LIMITS.loginEmail).toMatchObject({ limit: 5, windowSec: 900 });
    expect(LIMITS.resetRequest).toMatchObject({ limit: 3, windowSec: 3600 });
    expect(LIMITS.enquiryIp).toMatchObject({ limit: 5, windowSec: 3600 });
    expect(LIMITS.search).toMatchObject({ limit: 60, windowSec: 60 });
    expect(LIMITS.upload).toMatchObject({ limit: 30, windowSec: 3600 });
    expect(LIMITS.apiIp).toMatchObject({ limit: 300, windowSec: 60 });
  });

  it("a burst is cut at the limit and gets a Retry-After", async () => {
    const results = [];
    for (let i = 0; i < 65; i++) results.push(await rateLimit("search", "203.0.113.9"));
    expect(results.slice(0, 60).every((r) => r.success)).toBe(true);
    expect(results.slice(60).every((r) => !r.success)).toBe(true);
    expect(results[64].retryAfter).toBeGreaterThan(0);
    expect(results[64].retryAfter).toBeLessThanOrEqual(60);
  });
});

describe("limits set in the admin, within safe caps", () => {
  it("the schema refuses values outside the caps", () => {
    expect(abuseSchema.safeParse({ formsPerHour: 0 }).success).toBe(false);
    expect(abuseSchema.safeParse({ formsPerHour: 21 }).success).toBe(false);
    expect(abuseSchema.safeParse({ apiPerMinute: 5000 }).success).toBe(false);
    expect(abuseSchema.parse({})).toMatchObject({ formsPerHour: 5, searchPerMinute: 60, uploadsPerHour: 30, apiPerMinute: 300 });
  });

  it("a lower search limit applies at once", async () => {
    await setAbuse({ searchPerMinute: 10 });
    const ok = [];
    for (let i = 0; i < 12; i++) ok.push((await rateLimit("search", "203.0.113.10")).success);
    expect(ok.filter(Boolean)).toHaveLength(10);
  });
});

describe("blocked IPs", () => {
  it("matches single addresses and ranges, IPv4 and IPv6", () => {
    const list = ["203.0.113.7", "198.51.100.0/24", "2001:db8::/32"];
    expect(ipInRanges("203.0.113.7", list)).toBe(true);
    expect(ipInRanges("203.0.113.8", list)).toBe(false);
    expect(ipInRanges("198.51.100.250", list)).toBe(true);
    expect(ipInRanges("::ffff:198.51.100.3", list)).toBe(true);
    expect(ipInRanges("2001:db8:1::5", list)).toBe(true);
    expect(ipInRanges("2001:db9::1", list)).toBe(false);
    expect(ipInRanges("not-an-ip", list)).toBe(false);
  });

  it("refuses junk and ranges wide enough to block everyone", () => {
    for (const bad of ["0.0.0.0/0", "10.0.0.0/7", "::/0", "300.1.1.1", "1.2.3", "01.2.3.4", "1.2.3.4/33", "a.b.c.d", "1.2.3.4/24/1"])
      expect(isValidRange(bad), bad).toBe(false);
    for (const good of ["1.2.3.4", "10.0.0.0/8", "2001:db8::1", "2001:db8::/16"]) expect(isValidRange(good), good).toBe(true);
  });

  it("the setting blocks an address", async () => {
    await setAbuse({ blockedIps: ["192.0.2.0/24"] });
    expect(await isBlockedIp("192.0.2.44")).toBe(true);
    expect(await isBlockedIp("192.0.3.1")).toBe(false);
  });

  it("an admin cannot save a list that blocks their own address", async () => {
    const { user } = await makeUser({ role: "SUPER_ADMIN" });
    await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
    const { createSession } = await import("@/lib/auth/session");
    const { accessToken } = await createSession({ ...user, mfaSetupAt: new Date() });
    const { vi } = await import("vitest");
    vi.doMock("next/headers", async (orig) => ({
      ...(await orig()),
      cookies: async () => ({ get: (n) => (n.endsWith("gi_at") ? { value: accessToken } : undefined) }),
    }));
    vi.resetModules();
    const { PUT } = await import("@/app/api/admin/settings/[key]/route");
    const res = await PUT(
      new Request("http://localhost:3000/api/admin/settings/abuse", {
        method: "PUT",
        headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": "192.0.2.10" },
        body: JSON.stringify({ blockedIps: ["192.0.2.0/24"] }),
      }),
      { params: Promise.resolve({ key: "abuse" }) },
    );
    expect(res.status).toBe(400);
    vi.doUnmock("next/headers");
    vi.resetModules();
  });
});

describe("email bombing", () => {
  it("at most 8 emails per address per hour, whatever sends them", async () => {
    clearMail();
    const to = `bomb-${Date.now()}@example.in`;
    const sent = [];
    for (let i = 0; i < 11; i++) sent.push(await sendEmail({ to, subject: "Code", html: "<p>x</p>", text: "x", tags: ["otp-login"] }));
    expect(sent.filter(Boolean)).toHaveLength(8);
    expect(sentMail().filter((m) => m.to === to)).toHaveLength(8);
    expect(await sendEmail({ to: `other-${to}`, subject: "x", html: "x", text: "x" })).toBe(true);
  });
});

describe("exponential back-off on failed logins", () => {
  it("doubles each lockout within a day, capped at 24 hours", async () => {
    const { user } = await makeUser();
    expect(await nextLockMinutes(user.id)).toBe(LOCK_MINUTES);
    const lock = () => db.auditLog.create({ data: { actorId: user.id, action: "auth.login.locked", entity: "AdminUser" } });
    await lock();
    expect(await nextLockMinutes(user.id)).toBe(30);
    await lock();
    expect(await nextLockMinutes(user.id)).toBe(60);
    for (let i = 0; i < 10; i++) await lock();
    expect(await nextLockMinutes(user.id)).toBe(MAX_LOCK_MINUTES);
  });
});
