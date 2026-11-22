import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { safeNext } from "@/lib/client/safeNext";

/** Phase 29: open redirects, tabnabbing, autocomplete and admin links, checked in the source. */

const files = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(js|jsx)$/.test(n)) out.push(p);
  }
  return out;
};
const SRC = files(join(process.cwd(), "src"));

describe("open redirects (?next=)", () => {
  it("only same-site admin paths are followed", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "%2F%2Fevil.example",
      "/admin\\@evil.example",
      "javascript:alert(1)",
      "/products",
      "/admin/login?next=/admin",
      "/admin\u0000x",
      "%E0%A4%A",
      `/admin/${"a".repeat(400)}`,
    ]) {
      expect(safeNext(bad), bad).toBe("/admin");
    }
    expect(safeNext("/admin/products?status=DRAFT")).toBe("/admin/products?status=DRAFT");
    expect(safeNext("%2Fadmin%2Fusers")).toBe("/admin/users");
  });
});

describe("links and forms", () => {
  it("every target=_blank link carries rel=noopener noreferrer (or goes through Button, which adds it)", () => {
    const problems = [];
    for (const f of SRC) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/<(a|Link)\b/g)) {
        // the opening tag: up to the first ">" that ends a line or a self-closing "/>"
        const tag = src.slice(m.index, m.index + 600).split(/>\s*\n|\/>/)[0];
        if (tag.includes('target="_blank"') && !/rel="noopener noreferrer[^"]*"/.test(tag)) {
          problems.push(`${f}: ${tag.slice(0, 80)}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("sign-in fields use the right autocomplete hints", () => {
    const read = (p) => readFileSync(join(process.cwd(), p), "utf8");
    expect(read("src/app/admin/(auth)/login/LoginForm.jsx")).toMatch(/autoComplete="username"[\s\S]*autoComplete="current-password"/);
    expect(read("src/components/admin/auth/CodeInput.jsx")).toContain('autoComplete="one-time-code"');
    expect(read("src/components/admin/auth/NewPasswordFields.jsx")).toContain('autoComplete="new-password"');
  });

  it("the public site never links to the admin", () => {
    const pub = SRC.filter((f) => /[\\/](app[\\/]\(site\)|components[\\/](site|sections|content|catalogue|enquiry))[\\/]/.test(f));
    const hits = pub.filter((f) => /href=["'{`][^"'}`]*\/admin/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });

  it("the email preview iframe cannot run scripts", () => {
    const src = SRC.map((f) => readFileSync(f, "utf8")).join("\n");
    for (const m of src.matchAll(/<iframe\b[^>]*>/gs)) {
      if (!/sandbox=/.test(m[0])) continue;
      expect(m[0]).not.toContain("allow-scripts");
    }
  });
});
