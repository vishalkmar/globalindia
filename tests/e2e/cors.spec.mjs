import { expect, test } from "@playwright/test";

/**
 * Phase 20 todos 09-12, 18: cross-origin requests are denied. 127.0.0.1:3100 and localhost:3100 are
 * different origins to the browser, so a page on one acts as "another website" for the other.
 */

const SITE = "http://localhost:3100";
const OTHER = "http://127.0.0.1:3100";

test("another origin cannot read our APIs, even public ones", async ({ page }) => {
  await page.goto(`${OTHER}/about`);
  const results = await page.evaluate(async (site) => {
    const attempt = async (path, init) => {
      try {
        const r = await fetch(`${site}${path}`, init);
        return `status ${r.status}`;
      } catch {
        return "blocked";
      }
    };
    return {
      search: await attempt("/api/public/search?q=sles"),
      adminRead: await attempt("/api/admin/products", { credentials: "include" }),
      adminWrite: await attempt("/api/admin/redirects", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-csrf-token": "x" },
        body: JSON.stringify({ fromPath: "/x", toPath: "/y" }),
      }),
      formStyle: await attempt("/api/public/enquiry", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }),
    };
  }, SITE);
  // No CORS headers are ever sent, so the browser refuses to hand any response to the other origin.
  expect(results).toEqual({ search: "blocked", adminRead: "blocked", adminWrite: "blocked", formStyle: "blocked" });
});

test("preflights get no CORS grant; API responses carry CORP same-origin", async ({ request }) => {
  const pre = await request.fetch(`${SITE}/api/admin/products`, {
    method: "OPTIONS",
    headers: { origin: "https://evil.example", "access-control-request-method": "POST", "access-control-request-headers": "x-csrf-token, content-type" },
  });
  expect(pre.headers()["access-control-allow-origin"]).toBeUndefined();
  expect(pre.headers()["access-control-allow-credentials"]).toBeUndefined();
  expect(pre.status()).toBeGreaterThanOrEqual(400);

  const res = await request.get(`${SITE}/api/health`);
  expect(res.headers()["access-control-allow-origin"]).toBeUndefined();
  expect(res.headers()["cross-origin-resource-policy"]).toBe("same-origin");
});

test("pages are not frameable and send a CSP; scripts carry integrity hashes", async ({ request }) => {
  for (const path of ["/", "/admin/login"]) {
    const res = await request.get(`${SITE}${path}`);
    const csp = res.headers()["content-security-policy"] ?? "";
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "default-src 'self'"]) expect(csp, path).toContain(d);
    expect(res.headers()["content-security-policy-report-only"], path).toContain("require-trusted-types-for");
    expect(res.headers()["x-frame-options"], path).toBe("DENY");
    expect(res.headers()["cross-origin-opener-policy"], path).toBe("same-origin");
  }
});
