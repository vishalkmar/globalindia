import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { directUploadForm, signParams } from "@/lib/cloudinary";
import loader, { cropUrl } from "@/lib/media/imageLoader";

describe("Cloudinary signing", () => {
  it("signs the sorted params string + secret with SHA-1 (Cloudinary's documented format)", () => {
    const params = { timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" };
    const expected = createHash("sha1").update("eager=w_400,h_300,c_pad|w_260,h_200,c_crop&public_id=sample_image&timestamp=1315060510abcd").digest("hex");
    expect(signParams(params, "abcd")).toBe(expected);
  });

  it("never signs file, api_key, resource_type or cloud_name, and skips empty values", () => {
    const a = signParams({ public_id: "x", timestamp: 1, api_key: "k", file: "f", resource_type: "image", cloud_name: "c", invalidate: undefined }, "s");
    const b = signParams({ public_id: "x", timestamp: 1 }, "s");
    expect(a).toBe(b);
  });

  it("builds a direct-upload form the browser can post, without the secret", () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
    process.env.CLOUDINARY_API_KEY = "123456";
    process.env.CLOUDINARY_API_SECRET = "very-secret-value";
    const form = directUploadForm("gi_0123456789abcdef0123456789abcdef", "image");
    expect(form.url).toBe("https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
    expect(form.fields.public_id).toMatch(/^global-india\/dev\/gi_[a-f0-9]{32}$/);
    expect(form.fields.allowed_formats).toBe("jpg,png,webp,avif");
    expect(form.fields.transformation).toBe("c_limit,w_4000,h_4000");
    expect(form.fields.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(JSON.stringify(form)).not.toContain("very-secret-value");
    expect(directUploadForm("gi_0123456789abcdef0123456789abcdef", "pdf").url).toMatch(/\/raw\/upload$/);
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });
});

describe("image delivery", () => {
  const url = "https://res.cloudinary.com/demo/image/upload/v17/global-india/prod/gi_abc.jpg";

  it("adds f_auto, q_auto and a width limit", () => {
    expect(loader({ src: url, width: 640 })).toBe("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v17/global-india/prod/gi_abc.jpg");
    expect(loader({ src: url, width: 320, quality: 70 })).toContain("f_auto,q_70,c_limit,w_320/");
    expect(loader({ src: "/api/dev-media/gi_x.png?v=1", width: 640 })).toBe("/api/dev-media/gi_x.png?v=1&w=640");
  });

  it("crops around the focal point with g_xy_center, or g_auto when none is set", () => {
    expect(cropUrl({ url, width: 2000, height: 1000, focalX: 0.25, focalY: 0.5 }, "16:9")).toContain("/image/upload/c_fill,ar_16:9,g_xy_center,x_500,y_500/v17/");
    expect(cropUrl({ url, width: 2000, height: 1000 }, "1:1")).toContain("c_fill,ar_1:1,g_auto/");
    expect(cropUrl({ url: "/api/dev-media/gi_x.png" }, "1:1")).toBe("/api/dev-media/gi_x.png");
  });
});
