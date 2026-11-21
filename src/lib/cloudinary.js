import "server-only";

import { createHash } from "node:crypto";

import { isProduction, optionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Cloudinary driver (Phase 7 todo 01). No SDK — signed REST calls with the API secret, which never
 * leaves the server. The browser only ever receives a short-lived signature for ONE upload with
 * a public_id, folder and formats chosen by the server.
 */

export function cloudinaryConfig() {
  const cloudName = optionalEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = optionalEnv("CLOUDINARY_API_KEY");
  const apiSecret = optionalEnv("CLOUDINARY_API_SECRET");
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export const cloudinaryEnabled = () => Boolean(cloudinaryConfig());

const ROOT = () => `global-india/${isProduction ? "prod" : "dev"}`;
const resourceType = (kind) => (kind === "pdf" ? "raw" : "image");

/** Cloudinary signature: SHA-1 of the sorted "key=value&..." string + API secret. */
export function signParams(params, apiSecret) {
  const str = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "" && !["file", "api_key", "resource_type", "cloud_name"].includes(k))
    .sort()
    .map((k) => `${k}=${Array.isArray(params[k]) ? params[k].join(",") : params[k]}`)
    .join("&");
  return createHash("sha1").update(str + apiSecret).digest("hex");
}

function uploadParams(id, kind, { overwrite }) {
  const params = {
    public_id: `${ROOT()}/${id}`,
    timestamp: Math.floor(Date.now() / 1000),
    overwrite: overwrite ? "true" : "false",
    invalidate: overwrite ? "true" : undefined,
    unique_filename: "false",
    use_filename: "false",
  };
  if (kind === "image") {
    params.allowed_formats = "jpg,png,webp,avif";
    // Incoming transformation: Cloudinary re-encodes the original, which strips EXIF/GPS metadata
    // and any payload hidden in the file, and caps the size of what is stored.
    params.transformation = "c_limit,w_4000,h_4000";
  }
  return params;
}

/** Form fields + URL for a direct browser upload. */
export function directUploadForm(id, kind, { overwrite = false } = {}) {
  const cfg = cloudinaryConfig();
  const params = uploadParams(id, kind, { overwrite });
  return {
    url: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType(kind)}/upload`,
    fields: { ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)), api_key: cfg.apiKey, signature: signParams(params, cfg.apiSecret) },
    publicId: params.public_id,
  };
}

function basicAuth(cfg) {
  return `Basic ${Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64")}`;
}

/** Facts Cloudinary stored for an upload (Admin API). Returns null when it does not exist. */
export async function getResource(publicId, kind) {
  const cfg = cloudinaryConfig();
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/${resourceType(kind)}/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`,
    { headers: { authorization: basicAuth(cfg) }, cache: "no-store", signal: AbortSignal.timeout(10_000) },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Cloudinary resource lookup failed (${res.status})`);
  const r = await res.json();
  return { bytes: r.bytes, format: r.format, width: r.width ?? null, height: r.height ?? null, url: r.secure_url, version: r.version };
}

/** Downloads the stored file from our own Cloudinary account to inspect its bytes. */
export async function downloadStored(url, maxBytes) {
  const u = new URL(url);
  if (u.hostname !== "res.cloudinary.com") throw new Error("Unexpected delivery host");
  const res = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new Error("Stored file larger than allowed");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error("Stored file larger than allowed");
  return buf;
}

/** Server-side upload of bytes we already validated (URL uploads). */
export async function uploadBuffer(id, kind, buffer, { overwrite = false } = {}) {
  const cfg = cloudinaryConfig();
  const params = uploadParams(id, kind, { overwrite });
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) form.set(k, String(v));
  form.set("api_key", cfg.apiKey);
  form.set("signature", signParams(params, cfg.apiSecret));
  form.set("file", new Blob([buffer]));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType(kind)}/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    logger.error("cloudinary.upload_failed", { status: res.status });
    throw new Error("Upload to media storage failed");
  }
  const r = await res.json();
  return { publicId: r.public_id, bytes: r.bytes, format: r.format, width: r.width ?? null, height: r.height ?? null, url: r.secure_url, version: r.version };
}

export async function destroy(publicId, kind) {
  const cfg = cloudinaryConfig();
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: "true" };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.set(k, String(v));
  form.set("api_key", cfg.apiKey);
  form.set("signature", signParams(params, cfg.apiSecret));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType(kind)}/destroy`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) logger.error("cloudinary.destroy_failed", { status: res.status });
  return res.ok;
}
