#!/usr/bin/env node
/**
 * Launch smoke test (Phase 32 todo 07). Read-only: it never submits forms or signs in.
 *   node scripts/smoke.mjs https://www.example.in
 * Checks: every URL in sitemap.xml answers 200 with one <h1>; robots.txt; security headers; the admin
 * login page; /api/health; a sample of old-site 301 redirects; the contact page has its forms; unknown
 * pages answer 404. Prints a short report and exits 1 if anything fails.
 */

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const failures = [];
const ok = (cond, msg) => {
  if (!cond) failures.push(msg);
};
const get = (path, opts = {}) => fetch(path.startsWith("http") ? path : `${base}${path}`, { redirect: "manual", ...opts });

// 1. health, robots, headers
const health = await get("/api/health");
ok(health.status === 200, `/api/health answered ${health.status}`);
const robots = await (await get("/robots.txt")).text();
ok(/Sitemap:/.test(robots) && /Disallow: \/admin/.test(robots), "robots.txt missing sitemap or admin rule");
const home = await get("/");
const h = home.headers;
for (const [name, test] of [
  ["content-security-policy", /frame-ancestors 'none'/],
  ["strict-transport-security", /max-age=\d+/],
  ["x-content-type-options", /nosniff/],
  ["referrer-policy", /strict-origin/],
  ["cross-origin-opener-policy", /same-origin/],
]) {
  ok(test.test(h.get(name) ?? ""), `header ${name} missing or wrong on /`);
}
ok(!h.get("x-powered-by"), "x-powered-by header is exposed");

// 2. every sitemap URL
const xml = await (await get("/sitemap.xml")).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !/\.(jpg|jpeg|png|webp|avif)$/i.test(u));
ok(urls.length > 20, `sitemap lists only ${urls.length} pages`);
let checked = 0;
for (let i = 0; i < urls.length; i += 8) {
  await Promise.all(
    urls.slice(i, i + 8).map(async (u) => {
      const path = new URL(u).pathname;
      const res = await get(path);
      const html = res.status === 200 ? await res.text() : "";
      ok(res.status === 200, `${path} answered ${res.status}`);
      if (res.status === 200) ok((html.match(/<h1[\s>]/g) ?? []).length === 1, `${path} does not have exactly one <h1>`);
      checked += 1;
    }),
  );
}

// 3. forms, admin, 404, redirects
const contact = await (await get("/contact")).text();
ok(/Enquiry forms|id="quote"/.test(contact), "/contact has no enquiry form area");
const login = await get("/admin/login");
ok(login.status === 200, `/admin/login answered ${login.status}`);
ok(/noindex/.test(login.headers.get("x-robots-tag") ?? ""), "/admin/login is not marked noindex");
const missing = await get("/this-page-does-not-exist-xyz");
ok(missing.status === 404, `unknown page answered ${missing.status} (expected 404)`);
for (const [from, to] of [
  ["/food-grade-xanthan-gum-13185592.html", "/products/thickeners-carbohydrates/xanthan-gum"],
  ["/contact-us.html", "/contact"],
  ["/refined-glycerine.html", "/products/refined-glycerine"],
]) {
  const r = await get(from);
  ok(r.status === 301 && (r.headers.get("location") ?? "").endsWith(to), `${from} -> ${r.status} ${r.headers.get("location")}`);
}

console.log(`Checked ${checked} sitemap pages plus health, robots, headers, forms, admin, 404 and redirects on ${base}.`);
if (failures.length) {
  console.log(`\n${failures.length} problem(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("All good.");
