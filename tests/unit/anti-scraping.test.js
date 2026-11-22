import { randomBytes } from "node:crypto";

import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { resetAbuseSettings } from "@/lib/security/abuse";
import { __resetMemoryLimits } from "@/lib/security/rateLimit";

/** Phase 28: document links, robots.txt, and the historic CVE guards. */

const ORIGIN = "http://localhost:3000";
const stamp = Date.now();
let publicPdf;
let privatePdf;
let imageAsset;

const pdf = (extra = {}) =>
  db.mediaAsset.create({
    data: {
      publicId: `gi_${randomBytes(16).toString("hex")}`,
      type: "PDF",
      format: "pdf",
      bytes: 1000,
      url: "/api/dev-media/x.pdf",
      driver: "local",
      ...extra,
    },
  });

beforeAll(async () => {
  __resetMemoryLimits();
  resetAbuseSettings();
  const cat = await db.productCategory.create({ data: { name: `Doc Cat ${stamp}`, slug: `doc-cat-${stamp}`, family: "FOOD", status: "PUBLISHED" } });
  const product = await db.product.create({ data: { name: `Doc Product ${stamp}`, slug: `doc-product-${stamp}`, categoryId: cat.id, status: "PUBLISHED" } });
  publicPdf = await pdf();
  privatePdf = await pdf();
  imageAsset = await db.mediaAsset.create({
    data: { publicId: `gi_${randomBytes(16).toString("hex")}`, type: "IMAGE", format: "png", bytes: 10, url: "/x.png", driver: "local" },
  });
  await db.productDocument.create({ data: { productId: product.id, mediaId: publicPdf.id, type: "TDS", isPublic: true } });
  await db.productDocument.create({ data: { productId: product.id, mediaId: privatePdf.id, type: "COA", isPublic: false } });
});

const download = (id, headers = {}) =>
  import("@/app/d/[id]/route").then((m) =>
    m.GET(new Request(`${ORIGIN}/d/${id}`, { headers: { "x-forwarded-for": "198.51.100.40", ...headers } }), {
      params: Promise.resolve({ id }),
    }),
  );

describe("document downloads (/d/:id)", () => {
  it("public product documents redirect to a short-lived link; nothing is cached", async () => {
    const res = await download(publicPdf.id, { "sec-fetch-site": "same-origin" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/api/dev-media/x.pdf");
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("batch (private) documents, images, deleted files and junk ids are 404", async () => {
    expect((await download(privatePdf.id)).status).toBe(404);
    expect((await download(imageAsset.id)).status).toBe(404);
    expect((await download("cm0000000000000000000zzzz")).status).toBe(404);
    expect((await download("../../etc/passwd")).status).toBe(404);
    const gone = await pdf({ deletedAt: new Date() });
    expect((await download(gone.id)).status).toBe(404);
  });

  it("links on other websites (hotlinking) are refused", async () => {
    expect((await download(publicPdf.id, { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });

  it("bulk downloading from one address is cut off", async () => {
    __resetMemoryLimits();
    const statuses = [];
    for (let i = 0; i < 32; i++) statuses.push((await download(publicPdf.id, { "x-forwarded-for": "198.51.100.41" })).status);
    expect(statuses.slice(0, 30).every((s) => s === 302)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it("signed Cloudinary links expire and are signed with the API secret", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "123456";
    process.env.CLOUDINARY_API_SECRET = "s3cr3t-for-tests-only-0123456789";
    try {
      const { signedDownloadUrl } = await import("@/lib/cloudinary");
      const url = new URL(signedDownloadUrl("gi_abc", "pdf", { ttlSeconds: 600, now: 1_800_000_000_000 }));
      expect(url.origin + url.pathname).toBe("https://api.cloudinary.com/v1_1/demo/raw/download");
      expect(url.searchParams.get("expires_at")).toBe(String(1_800_000_000 + 600));
      expect(url.searchParams.get("signature")).toMatch(/^[a-f0-9]{40}$/);
      expect(url.toString()).not.toContain("s3cr3t");
    } finally {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;
    }
  });
});

describe("robots.txt", () => {
  it("keeps crawlers out of admin, APIs and download links; AI crawlers only when the owner asks", async () => {
    const { default: robots, AI_CRAWLERS } = await import("@/app/robots");
    const plain = await robots();
    expect(plain.rules[0].disallow).toEqual(expect.arrayContaining(["/admin", "/api/", "/d/"]));
    expect(plain.rules).toHaveLength(1);
    expect(AI_CRAWLERS).toEqual(expect.arrayContaining(["GPTBot", "CCBot", "ClaudeBot", "Google-Extended"]));
  });
});

describe("historic CVE guards", () => {
  it("CVE-2025-29927: the proxy strips x-middleware-subrequest before anything else sees it", async () => {
    const { proxy } = await import("@/proxy");
    const res = await proxy(
      new NextRequest(`${ORIGIN}/admin/users`, { headers: { "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware" } }),
    );
    // no access cookie: still sent to the login page, the header did not skip the check
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login");
  });

  it("patched framework versions (Next >= 16.0.7 for the RSC RCE, React >= 19.2.1)", async () => {
    const v = (s) => s.split(".").map(Number);
    const atLeast = (a, b) => {
      const [x, y] = [v(a), v(b)];
      for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
      return true;
    };
    const next = (await import("next/package.json", { with: { type: "json" } })).default.version;
    const react = (await import("react/package.json", { with: { type: "json" } })).default.version;
    expect(atLeast(next, "16.0.7")).toBe(true);
    expect(atLeast(react, "19.2.1")).toBe(true);
  });
});
