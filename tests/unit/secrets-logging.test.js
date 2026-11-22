import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { redact } from "@/lib/logger";
import { AUDIT_DAYS, purgeOldRecords } from "@/lib/retention";
import { proxy } from "@/proxy";

import { makeUser } from "../helpers.js";

/** Phase 24: secrets stay on the server, logs are redacted, old records are purged, secret paths 404. */

const files = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(js|jsx)$/.test(n)) out.push(p);
  }
  return out;
};
const SRC = files(join(process.cwd(), "src"));

describe("secrets stay on the server", () => {
  it("only public values use NEXT_PUBLIC_", () => {
    const names = new Set(SRC.flatMap((f) => readFileSync(f, "utf8").match(/NEXT_PUBLIC_[A-Z_]+/g) ?? []));
    expect([...names].sort()).toEqual(["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"]);
  });

  it("every module that reads a secret starts with import 'server-only'", () => {
    const secretUse = /requireSecret|authEnv\.|BREVO_API_KEY|CLOUDINARY_API_SECRET|TURNSTILE_SECRET|UPSTASH_REDIS_REST_TOKEN|CRON_SECRET/;
    const missing = SRC.filter((f) => {
      const t = readFileSync(f, "utf8");
      return secretUse.test(t) && !/^import "server-only";/m.test(t) && !f.endsWith(join("lib", "env.js"));
    });
    expect(missing).toEqual([]);
  });

  it("no console.log / console.debug left in the code", () => {
    const hits = SRC.filter((f) => /console\.(log|debug|trace)\(/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});

describe("logs", () => {
  it("redacts passwords, tokens, codes, cookies and auth headers at any depth, and strips CR/LF", () => {
    const out = redact({
      email: "a@b.in",
      password: "hunter2",
      body: { otp: "123456", code: "654321", nested: { refreshToken: "x", Authorization: "Bearer y", cookie: "gi_at=z" } },
      note: "line1\r\nFAKE LOG LINE",
    });
    const s = JSON.stringify(out);
    for (const secret of ["hunter2", "123456", "654321", "Bearer y", "gi_at=z"]) expect(s).not.toContain(secret);
    expect(out.email).toBe("a@b.in");
    expect(out.note).not.toMatch(/[\r\n]/);
  });
});

describe("retention", () => {
  it("deletes stale codes, links, requests, sessions and year-old audit rows; keeps recent ones", async () => {
    const { user } = await makeUser();
    const old = new Date(Date.now() - 40 * 86_400_000);
    const recent = new Date(Date.now() - 1 * 86_400_000);
    await db.otpCode.createMany({
      data: [
        { userId: user.id, purpose: "LOGIN", codeHash: `old-${Date.now()}`, expiresAt: old },
        { userId: user.id, purpose: "LOGIN", codeHash: `new-${Date.now()}`, expiresAt: recent },
      ],
    });
    const ancient = await db.auditLog.create({
      data: { action: "test.ancient", entity: "Test", at: new Date(Date.now() - (AUDIT_DAYS + 5) * 86_400_000) },
    });
    const fresh = await db.auditLog.create({ data: { action: "test.fresh", entity: "Test" } });
    await purgeOldRecords();
    expect(await db.otpCode.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.auditLog.findUnique({ where: { id: ancient.id } })).toBeNull();
    expect(await db.auditLog.findUnique({ where: { id: fresh.id } })).not.toBeNull();
  });
});

describe("secret paths are never served", () => {
  it("/.env, /.git and source maps answer 404 from the proxy", async () => {
    for (const path of ["/.env", "/.env.local", "/.git/config", "/x/.env.production", "/_next/static/chunks/a.js.map"]) {
      const res = await proxy(new NextRequest(`http://localhost:3000${path}`));
      expect(res.status, path).toBe(404);
    }
    const ok = await proxy(new NextRequest("http://localhost:3000/about"));
    expect(ok.status).not.toBe(404);
  });
});
