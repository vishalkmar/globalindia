import { deflateSync } from "node:zlib";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { createSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { detectFileType, looksLikeMarkup, pdfActiveContent } from "@/lib/media/fileType";
import { imageSize } from "@/lib/media/imageSize";
import { createIntent, newMediaId, readIntent } from "@/lib/media/intent";
import { validateBuffer } from "@/lib/media/service";
import { assertSafeUrl, isBlockedAddress, safeFetch, SafeFetchError } from "@/lib/security/ssrf";

import { makeUser } from "../helpers.js";

/* ---------- fixtures ---------- */

function png(width, height) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write("IHDR", 4, "latin1");
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8;
  ihdr[17] = 2;
  const iend = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  return Buffer.concat([sig, ihdr, Buffer.alloc(64), iend]);
}

function jpeg(width, height) {
  const sof = Buffer.from([
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 255,
    width >> 8,
    width & 255,
    0x03,
    1,
    0x22,
    0,
    2,
    0x11,
    1,
    3,
    0x11,
    1,
  ]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.from("JFIF\0", "latin1"),
    Buffer.alloc(9),
    sof,
    Buffer.from([0xff, 0xd9]),
  ]);
}

const cleanPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj <</Type/Catalog/Pages 2 0 R/OpenAction [3 0 R /Fit]>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF",
);
const LIMITS = { imageBytes: 5 * 1024 * 1024, pdfBytes: 10 * 1024 * 1024, filesPerBatch: 20 };

/* ---------- file type and content checks ---------- */

describe("magic bytes", () => {
  it("detects allowed types from bytes", () => {
    expect(detectFileType(png(10, 10))?.ext).toBe("png");
    expect(detectFileType(jpeg(10, 10))?.ext).toBe("jpg");
    expect(detectFileType(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1"))?.ext).toBe("webp");
    expect(detectFileType(Buffer.from("\0\0\0\x1cftypavif\0\0\0\0", "latin1"))?.ext).toBe("avif");
    expect(detectFileType(cleanPdf)?.ext).toBe("pdf");
  });

  it("refuses GIF, executables and markup", () => {
    expect(detectFileType(Buffer.from("GIF89a\0\0\0\0\0\0", "latin1"))).toBeNull();
    expect(detectFileType(Buffer.from("MZ\x90\0\x03\0\0\0\x04\0\0\0", "latin1"))).toBeNull();
    expect(looksLikeMarkup(Buffer.from('<?xml version="1.0"?><svg onload="alert(1)"/>'))).toBe(true);
    expect(looksLikeMarkup(Buffer.from("﻿  <html><script>x</script>"))).toBe(true);
  });

  it("reads image dimensions from headers", () => {
    expect(imageSize(png(1200, 800), "png")).toEqual({ width: 1200, height: 800 });
    expect(imageSize(jpeg(640, 480), "jpg")).toEqual({ width: 640, height: 480 });
  });
});

describe("PDF active content", () => {
  it("allows a normal PDF (OpenAction to fit page is fine)", () => {
    expect(pdfActiveContent(cleanPdf)).toBeNull();
  });
  it.each([
    ["plain JavaScript", "%PDF-1.4 <</S/JavaScript/JS(app.alert(1))>>"],
    ["hex-escaped name", "%PDF-1.4 <</S/J#61vaScript>>"],
    ["launch action", "%PDF-1.4 <</S/Launch/F(cmd.exe)>>"],
    ["embedded file", "%PDF-1.4 <</Type/EmbeddedFile>>"],
    ["encrypted", "%PDF-1.4 trailer <</Encrypt 5 0 R>>"],
  ])("refuses %s", (_, text) => {
    expect(pdfActiveContent(Buffer.from(text, "latin1"))).not.toBeNull();
  });
  it("finds JavaScript hidden in a compressed object stream", () => {
    const hidden = Buffer.concat([
      Buffer.from("%PDF-1.7\n4 0 obj <</Type/ObjStm/Filter/FlateDecode>> stream\n"),
      deflateSync(Buffer.from("<</S /JavaScript /JS (this.exportDataObject())>>")),
      Buffer.from("\nendstream endobj\n%%EOF"),
    ]);
    expect(pdfActiveContent(hidden)).toMatch(/JavaScript/);
  });
});

describe("validateBuffer (oversize, wrong type, SVG, bombs)", () => {
  it("accepts a valid PNG and returns facts + hash", () => {
    const info = validateBuffer(png(800, 600), "image", LIMITS);
    expect(info).toMatchObject({ ext: "png", width: 800, height: 600 });
    expect(info.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it("refuses an oversize image", () => {
    const big = Buffer.concat([png(800, 600), Buffer.alloc(6 * 1024 * 1024)]);
    expect(() => validateBuffer(big, "image", LIMITS)).toThrow(/limit/);
  });
  it("refuses a PDF where an image is expected, and the other way round", () => {
    expect(() => validateBuffer(cleanPdf, "image", LIMITS)).toThrow(/image/);
    expect(() => validateBuffer(png(10, 10), "pdf", LIMITS)).toThrow(/PDF/);
  });
  it("refuses SVG even when it claims to be an image", () => {
    expect(() =>
      validateBuffer(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
        "image",
        LIMITS,
      ),
    ).toThrow(/SVG/);
  });
  it("refuses decompression-bomb dimensions", () => {
    expect(() => validateBuffer(png(60000, 60000), "image", LIMITS)).toThrow(/dimensions/);
  });
  it("refuses a PDF with JavaScript", () => {
    expect(() => validateBuffer(Buffer.from("%PDF-1.4 <</S/JavaScript/JS(x)>>"), "pdf", LIMITS)).toThrow(
      /JavaScript/,
    );
  });
});

/* ---------- SSRF ---------- */

vi.mock("node:dns", async (orig) => {
  const real = await orig();
  return {
    ...real,
    lookup: (host, opts, cb) => {
      const answers = {
        "evil-rebind.example": [{ address: "10.0.0.5", family: 4 }],
        "metadata.example": [{ address: "169.254.169.254", family: 4 }],
        "mixed.example": [
          { address: "93.184.216.34", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ],
        "v6local.example": [{ address: "::1", family: 6 }],
      };
      if (answers[host]) return cb(null, opts.all ? answers[host] : answers[host][0].address, 4);
      return real.lookup(host, opts, cb);
    },
  };
});

describe("SSRF guard", () => {
  it("blocks private, loopback, link-local, metadata and mapped addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fe80::1",
      "fd00::1",
      "::ffff:127.0.0.1",
      "224.0.0.1",
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700::6810:84e5"])
      expect(isBlockedAddress(ip), ip).toBe(false);
  });

  it("refuses unsafe URL shapes before any network call", () => {
    for (const url of [
      "http://example.com/a.png",
      "file:///etc/passwd",
      "gopher://127.0.0.1:6379/_x",
      "ftp://example.com/a.pdf",
      "https://user:pass@example.com/a.png",
      "https://example.com:8443/a.png",
      "https://localhost/a.png",
      "https://127.0.0.1/a.png",
      "https://0x7f000001/a.png",
      "https://[::1]/a.png",
      "https://169.254.169.254/latest/meta-data/",
      "https://metadata.google.internal/computeMetadata/v1/",
    ]) {
      expect(() => assertSafeUrl(url), url).toThrow(SafeFetchError);
    }
  });

  it("refuses hostnames whose DNS answer is private (rebinding / metadata)", async () => {
    for (const host of ["evil-rebind.example", "metadata.example", "mixed.example", "v6local.example"]) {
      await expect(safeFetch(`https://${host}/photo.jpg`), host).rejects.toBeInstanceOf(SafeFetchError);
    }
  });
});

/* ---------- signed upload intents ---------- */

describe("upload intents", () => {
  it("round-trips for the same user only, and rejects tampering", () => {
    const id = newMediaId();
    const token = createIntent({ id, kind: "image", userId: "u1", driver: "local" });
    expect(readIntent(token, "u1")).toMatchObject({ id, kind: "image", replaceId: null });
    expect(readIntent(token, "u2")).toBeNull();
    const [b64, mac] = token.split(".");
    const forged = Buffer.from(Buffer.from(b64, "base64url").toString().replace("image", "pdf")).toString(
      "base64url",
    );
    expect(readIntent(`${forged}.${mac}`, "u1")).toBeNull();
    expect(readIntent("garbage", "u1")).toBeNull();
  });

  it("expires after 15 minutes", () => {
    const token = createIntent({ id: newMediaId(), kind: "pdf", userId: "u1", driver: "local" });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 16 * 60 * 1000);
    expect(readIntent(token, "u1")).toBeNull();
    vi.useRealTimers();
  });
});

/* ---------- full flow through the route handlers (local dev driver) ---------- */

const cookieJar = { access: "" };
vi.mock("next/headers", async (orig) => ({
  ...(await orig()),
  cookies: async () => ({
    get: (name) => (name.endsWith("gi_at") ? { value: cookieJar.access } : undefined),
  }),
}));

const ORIGIN = "http://localhost:3000";
const jsonReq = (method, body) =>
  new Request(`${ORIGIN}/api/admin/media`, {
    method,
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: body ? JSON.stringify(body) : undefined,
  });

async function asEditor() {
  const { user } = await makeUser({ role: "EDITOR" });
  await db.adminUser.update({ where: { id: user.id }, data: { mfaSetupAt: new Date() } });
  cookieJar.access = (await createSession(user)).accessToken;
  return user;
}

describe("media routes (local driver)", () => {
  let sign, localUpload, confirm, item, fromUrl;
  beforeAll(async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    sign = (await import("@/app/api/admin/media/sign/route")).POST;
    localUpload = (await import("@/app/api/admin/media/local-upload/route")).POST;
    confirm = (await import("@/app/api/admin/media/confirm/route")).POST;
    item = await import("@/app/api/admin/media/[id]/route");
    fromUrl = (await import("@/app/api/admin/media/from-url/route")).POST;
  });

  async function upload(buffer, { kind = "image", mime = "image/png", alt = "" } = {}) {
    const s = await sign(jsonReq("POST", { kind, mime, bytes: buffer.length }));
    expect(s.status).toBe(200);
    const { intent, driver } = await s.json();
    expect(driver).toBe("local");
    const form = new FormData();
    form.set("intent", intent);
    form.set("file", new Blob([buffer]));
    const up = await localUpload(
      new Request(`${ORIGIN}/api/admin/media/local-upload`, {
        method: "POST",
        headers: { origin: ORIGIN },
        body: form,
      }),
    );
    return {
      up,
      intent,
      confirmRes:
        up.status === 200
          ? await confirm(jsonReq("POST", { intent, folder: "products", alt, originalName: "drum.png" }))
          : null,
    };
  }

  it("uploads an image end to end and stores the facts", async () => {
    const user = await asEditor();
    const { confirmRes } = await upload(png(1024, 768), { alt: "Blue 200 L drums" });
    expect(confirmRes.status).toBe(201);
    const { asset } = await confirmRes.json();
    expect(asset).toMatchObject({
      type: "IMAGE",
      format: "png",
      width: 1024,
      height: 768,
      folder: "products",
      needsAlt: false,
    });
    const row = await db.mediaAsset.findUnique({ where: { id: asset.id } });
    expect(row.uploadedById).toBe(user.id);
    expect(
      await db.auditLog.findFirst({ where: { action: "media.upload", entityId: asset.id } }),
    ).not.toBeNull();
  });

  it("refuses oversize and disallowed types at the sign step", async () => {
    await asEditor();
    expect(
      (await sign(jsonReq("POST", { kind: "image", mime: "image/png", bytes: 6 * 1024 * 1024 }))).status,
    ).toBe(413);
    expect((await sign(jsonReq("POST", { kind: "image", mime: "image/svg+xml", bytes: 100 }))).status).toBe(
      400,
    );
    expect((await sign(jsonReq("POST", { kind: "pdf", mime: "image/png", bytes: 100 }))).status).toBe(415);
  });

  it("refuses an SVG renamed to .png at the byte check", async () => {
    await asEditor();
    const { up } = await upload(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'),
    );
    expect(up.status).toBe(415);
  });

  it("refuses a URL that points inside the network", async () => {
    await asEditor();
    const res = await fromUrl(
      jsonReq("POST", { url: "https://169.254.169.254/latest/meta-data/iam", kind: "image" }),
    );
    expect(res.status).toBe(400);
    const res2 = await fromUrl(jsonReq("POST", { url: "https://evil-rebind.example/a.png", kind: "image" }));
    expect(res2.status).toBe(400);
  });

  it("will not delete a file that is in use", async () => {
    await asEditor();
    const { confirmRes } = await upload(png(400, 300), { alt: "Glycerine can" });
    const { asset } = await confirmRes.json();
    await db.productCategory.create({
      data: { slug: `test-cat-${Date.now()}`, name: "Test category", family: "FOOD", imageId: asset.id },
    });
    const ctx = { params: Promise.resolve({ id: asset.id }) };
    const del = await item.DELETE(jsonReq("DELETE"), ctx);
    expect(del.status).toBe(409);
    const body = await del.json();
    expect(body.usage[0].label).toMatch(/Category: Test category/);
  });

  it("deletes an unused file (soft delete) and hides it from the library", async () => {
    await asEditor();
    const { confirmRes } = await upload(png(300, 300), { alt: "Pallet" });
    const { asset } = await confirmRes.json();
    const ctx = { params: Promise.resolve({ id: asset.id }) };
    expect((await item.DELETE(jsonReq("DELETE"), ctx)).status).toBe(200);
    expect((await item.GET(jsonReq("GET"), ctx)).status).toBe(404);
  });

  it("strips tags from alt text and validates focal points", async () => {
    await asEditor();
    const { confirmRes } = await upload(png(300, 200));
    const { asset } = await confirmRes.json();
    expect(asset.needsAlt).toBe(true);
    const ctx = { params: Promise.resolve({ id: asset.id }) };
    const bad = await item.PATCH(jsonReq("PATCH", { alt: "<img src=x onerror=alert(1)>" }), ctx);
    expect(bad.status).toBe(400); // < and > refused by the schema
    const ok = await item.PATCH(
      jsonReq("PATCH", { alt: "Soap noodles in 25 kg bags", focalX: 0.3, focalY: 0.6 }),
      ctx,
    );
    expect((await ok.json()).asset).toMatchObject({
      alt: "Soap noodles in 25 kg bags",
      focalX: 0.3,
      focalY: 0.6,
      needsAlt: false,
    });
    expect((await item.PATCH(jsonReq("PATCH", { focalX: 2, focalY: 0.5 }), ctx)).status).toBe(400);
  });

  it("replace keeps the same asset id and bumps the version", async () => {
    await asEditor();
    const { confirmRes } = await upload(png(500, 500), { alt: "Old photo" });
    const { asset } = await confirmRes.json();
    const s = await sign(
      jsonReq("POST", { kind: "image", mime: "image/jpeg", bytes: 200, replaceId: asset.id }),
    );
    const { intent } = await s.json();
    const form = new FormData();
    form.set("intent", intent);
    form.set("file", new Blob([jpeg(640, 480)]));
    expect(
      (
        await localUpload(
          new Request(`${ORIGIN}/x`, { method: "POST", headers: { origin: ORIGIN }, body: form }),
        )
      ).status,
    ).toBe(200);
    const done = await confirm(jsonReq("POST", { intent, folder: "library", alt: "", originalName: "" }));
    const { asset: replaced } = await done.json();
    expect(replaced.id).toBe(asset.id);
    expect(replaced).toMatchObject({ format: "jpg", width: 640, height: 480, version: 2, alt: "Old photo" });
  });
});

describe("product documents (COA / SDS / TDS)", () => {
  it("attaches PDFs only, once per type, and shows them in usage", async () => {
    await asEditor();
    const sign = (await import("@/app/api/admin/media/sign/route")).POST;
    const localUpload = (await import("@/app/api/admin/media/local-upload/route")).POST;
    const confirm = (await import("@/app/api/admin/media/confirm/route")).POST;
    const docs = await import("@/app/api/admin/products/[id]/documents/route");
    const item = await import("@/app/api/admin/media/[id]/route");

    async function put(buffer, kind, mime, alt) {
      const { intent } = await (await sign(jsonReq("POST", { kind, mime, bytes: buffer.length }))).json();
      const form = new FormData();
      form.set("intent", intent);
      form.set("file", new Blob([buffer]));
      await localUpload(
        new Request(`${ORIGIN}/x`, { method: "POST", headers: { origin: ORIGIN }, body: form }),
      );
      return (
        await (
          await confirm(jsonReq("POST", { intent, folder: "documents", alt, originalName: "coa.pdf" }))
        ).json()
      ).asset;
    }

    const cat = await db.productCategory.create({
      data: { slug: `docs-cat-${Date.now()}`, name: "Docs", family: "PERSONAL_CARE" },
    });
    const product = await db.product.create({
      data: { slug: `glycerine-${Date.now()}`, name: "Refined Glycerine 99.5%", categoryId: cat.id },
    });
    const pdf = await put(cleanPdf, "pdf", "application/pdf", "");
    const img = await put(png(100, 100), "image", "image/png", "Drum");
    const ctx = { params: Promise.resolve({ id: product.id }) };

    expect((await docs.POST(jsonReq("POST", { mediaId: pdf.id, type: "COA" }), ctx)).status).toBe(201);
    expect((await docs.POST(jsonReq("POST", { mediaId: pdf.id, type: "COA" }), ctx)).status).toBe(400); // duplicate
    expect((await docs.POST(jsonReq("POST", { mediaId: img.id, type: "SDS" }), ctx)).status).toBe(400); // not a PDF
    const list = await (await docs.GET(jsonReq("GET"), ctx)).json();
    expect(list.documents).toHaveLength(1);

    const usage = await (await item.GET(jsonReq("GET"), { params: Promise.resolve({ id: pdf.id }) })).json();
    expect(usage.usage[0].label).toMatch(/COA document: Refined Glycerine/);
  });
});
