import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import { Breadcrumb } from "@/components/site/Breadcrumb";
import { db } from "@/lib/db";
import { jsonLd } from "@/lib/seo/jsonLd";

const ORIGIN = "http://localhost:3000";

describe("search API", () => {
  let GET;
  const stamp = Date.now();
  beforeAll(async () => {
    GET = (await import("@/app/api/public/search/route")).GET;
    const cat = await db.productCategory.create({
      data: { slug: `glycerine-${stamp}`, name: `Refined Glycerine ${stamp}`, family: "PERSONAL_CARE" },
    });
    await db.product.create({
      data: {
        slug: `glycerine-995-${stamp}`,
        name: `Glycerine 99.5% USP ${stamp}`,
        casNo: "56-81-5",
        grade: "USP",
        categoryId: cat.id,
        status: "PUBLISHED",
      },
    });
    await db.product.create({
      data: {
        slug: `glycerine-draft-${stamp}`,
        name: `Glycerine secret draft ${stamp}`,
        categoryId: cat.id,
        status: "DRAFT",
      },
    });
  });

  const search = (q, headers = {}) =>
    GET(
      new Request(`${ORIGIN}/api/public/search?q=${encodeURIComponent(q)}`, {
        headers: { "x-forwarded-for": `10.9.${stamp % 200}.1`, ...headers },
      }),
    );

  it("finds published products and categories by name or CAS, never drafts", async () => {
    const res = await search(`${stamp}`);
    const data = await res.json();
    expect(data.products.map((p) => p.name)).toEqual([`Glycerine 99.5% USP ${stamp}`]);
    expect(data.products[0]).toMatchObject({
      casNo: "56-81-5",
      href: `/products/glycerine-${stamp}/glycerine-995-${stamp}`,
    });
    expect(data.categories[0]).toMatchObject({ name: `Refined Glycerine ${stamp}`, count: 1 });
    const byCas = await (await search("56-81-5")).json();
    expect(byCas.products.some((p) => p.casNo === "56-81-5")).toBe(true);
    expect(JSON.stringify(data)).not.toContain("secret draft");
  });

  it("returns nothing for one-letter queries and refuses cross-site callers", async () => {
    expect(await (await search("g")).json()).toEqual({ ok: true, products: [], categories: [] });
    expect((await search("glycerine", { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });

  it("does not leak internal fields", async () => {
    const data = await (await search(`${stamp}`)).json();
    for (const key of Object.keys(data.products[0]))
      expect(["name", "href", "casNo", "grade", "category"]).toContain(key);
  });
});

describe("consent API", () => {
  it("stores the choice in an httpOnly cookie, same-origin only", async () => {
    const { POST } = await import("@/app/api/public/consent/route");
    const ok = await POST(
      new Request(`${ORIGIN}/api/public/consent`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify({ analytics: false }),
      }),
    );
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get("set-cookie");
    expect(cookie).toMatch(/gi_consent=v1\.denied/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    const bad = await POST(
      new Request(`${ORIGIN}/api/public/consent`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example" },
        body: JSON.stringify({ analytics: true }),
      }),
    );
    expect(bad.status).toBe(403);
  });
});

describe("breadcrumb", () => {
  it("renders the trail, marks the current page and emits safe BreadcrumbList JSON-LD", () => {
    const html = renderToStaticMarkup(
      Breadcrumb({
        items: [
          { label: "Products", href: "/products" },
          { label: "Glycerine </script><script>alert(1)</script>" },
        ],
      }),
    );
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"position":3');
    expect(html).not.toContain("</script><script>alert(1)");
  });

  it("jsonLd escapes < and line separators", () => {
    expect(jsonLd({ a: "</script>" })).toBe('{"a":"\\u003c/script>"}');
  });
});
