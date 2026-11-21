import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { redact } from "@/lib/logger";

/** Phase 4 todo 20 / Phase 23 todo 15: no code path may put auth data in Web Storage. */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/** Remove block and line comments so documentation that mentions the APIs is not a false positive. */
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

describe("token storage", () => {
  it("no source file uses localStorage, sessionStorage or document.cookie", () => {
    const offenders = walk(join(process.cwd(), "src")).filter((file) =>
      /\b(localStorage|sessionStorage|document\.cookie)\b/.test(stripComments(readFileSync(file, "utf8"))),
    );
    expect(offenders).toEqual([]);
  });
});

describe("log redaction", () => {
  it("removes secrets at any depth and strips newlines", () => {
    const out = redact({ email: "a@b.in", password: "x", nested: { refreshToken: "y", otp: "123456", note: "line1\nFAKE line" } });
    expect(out.password).toBe("[redacted]");
    expect(out.nested.refreshToken).toBe("[redacted]");
    expect(out.nested.otp).toBe("[redacted]");
    expect(out.nested.note).toBe("line1 FAKE line");
  });
});
