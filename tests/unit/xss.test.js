import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildCsp, buildReportOnlyCsp, makeNonce } from "@/lib/security/csp";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { jsonLd } from "@/lib/seo/jsonLd";
import { safeHref } from "@/lib/settings/schemas";
import { themeToCss } from "@/lib/theme/css";

/** Phase 20: stored, reflected, DOM, mutation, SVG, markdown-style and javascript: URL XSS. */

const PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg/onload=alert(1)>",
  "<svg><script>alert(1)</script></svg>",
  "<a href=\"javascript:alert(1)\">x</a>",
  "<a href=\"JaVaScRiPt:alert(1)\">x</a>",
  "<a href=\"java\tscript:alert(1)\">x</a>",
  "<a href=\"data:text/html,<script>alert(1)</script>\">x</a>",
  "<a href=\"vbscript:msgbox(1)\">x</a>",
  "<iframe src=\"javascript:alert(1)\"></iframe>",
  "<body onload=alert(1)>",
  "<div style=\"background:url(javascript:alert(1))\">x</div>",
  "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
  "<noscript><p title=\"</noscript><img src=x onerror=alert(1)>\">",
  "<form action=\"https://evil.example\"><button>x</button></form>",
  "<object data=\"javascript:alert(1)\"></object>",
  "<p>[click](javascript:alert(1))</p>",
  "<details open ontoggle=alert(1)>",
  "<input autofocus onfocus=alert(1)>",
  "<base href=\"https://evil.example/\">",
  "<meta http-equiv=\"refresh\" content=\"0;url=javascript:alert(1)\">",
  "\"><script>alert(1)</script>",
  "<scr<script>ipt>alert(1)</scr</script>ipt>",
];

describe("rich text sanitiser", () => {
  it("removes every executable part of the classic payloads", () => {
    for (const p of PAYLOADS) {
      const out = sanitizeRichText(p).toLowerCase();
      expect(out, p).not.toMatch(/<script|<svg|<iframe|<object|<embed|<form|<input|<base|<meta|<style|<math|\son\w+\s*=|style=/);
      // dangerous schemes only matter inside attributes (plain text such as markdown is not rendered as a link)
      expect(out, p).not.toMatch(/(href|src|action|data)\s*=\s*["']?\s*(javascript|vbscript|data:text)/);
    }
  });
  it("keeps normal formatting and safe links", () => {
    const out = sanitizeRichText('<h2>Grades</h2><p>See <a href="https://example.com">this</a> and <a href="/products">products</a>.</p>');
    expect(out).toContain("<h2>Grades</h2>");
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('<a href="/products">');
  });
});

describe("structured data and links", () => {
  it("JSON-LD cannot close its <script> tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>", x: String.fromCharCode(0x2028, 0x2029) });
    expect(out).not.toContain("</script");
    expect(out.includes(String.fromCharCode(0x2028)) || out.includes(String.fromCharCode(0x2029))).toBe(false);
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
  it("admin-entered links accept only http(s), mailto, tel and site paths", () => {
    for (const bad of ["javascript:alert(1)", " javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,x", "vbscript:x", "//evil.example", "\\\\evil.example"]) {
      expect(safeHref.safeParse(bad).success, bad).toBe(false);
    }
    for (const good of ["/contact", "https://example.com", "tel:+919810012345", "mailto:a@b.in", ""]) expect(safeHref.safeParse(good).success, good).toBe(true);
  });
  it("theme CSS cannot break out of its <style> tag", () => {
    const css = themeToCss({ primary: "</style><script>alert(1)</script>", fontDisplay: "x;}</style><script>" });
    expect(css).not.toMatch(/<\/?(style|script)/i);
  });
});

describe("dangerouslySetInnerHTML is only used with escaped or sanitised content", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|jsx)$/.test(name)) files.push(p);
    }
  };
  walk(join(process.cwd(), "src"));

  it("every use is JSON-LD via jsonLd(), theme CSS, or HTML from sanitizeRichText in the same file", () => {
    const problems = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/dangerouslySetInnerHTML=\{\{\s*__html:\s*([^}]+)\}\}/g)) {
        const expr = m[1].trim();
        const ok =
          /^jsonLd\(/.test(expr) ||
          /^themeToCss\(/.test(expr) ||
          (expr === "css" && /themeToCss\(/.test(src)) ||
          (/^(html|guide)$/.test(expr) && /sanitizeRichText\(/.test(src));
        if (!ok) problems.push(`${file}: ${expr}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("Content-Security-Policy", () => {
  it("admin policy: nonce + strict-dynamic, no unsafe-inline scripts, no plugins, no framing", () => {
    const nonce = makeNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    const csp = buildCsp({ nonce });
    const script = csp.split("; ").find((d) => d.startsWith("script-src"));
    expect(script).toContain(`'nonce-${nonce}'`);
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "default-src 'self'", "report-uri /api/csp-report"]) expect(csp).toContain(d);
    expect(csp).not.toMatch(/\*(?!\.)/); // no bare wildcard sources
  });
  it("development adds only what React Refresh needs", () => {
    expect(buildCsp({ nonce: "x", dev: true })).toContain("'unsafe-eval'");
    expect(buildCsp({ nonce: "x", dev: false })).not.toContain("'unsafe-eval'");
  });
  it("Trusted Types are reported (not yet enforced)", () => {
    expect(buildReportOnlyCsp()).toBe("require-trusted-types-for 'script'; report-uri /api/csp-report");
  });
});
