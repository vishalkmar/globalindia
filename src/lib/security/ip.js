import "server-only";

import { hmac } from "@/lib/auth/crypto";
import { authEnv } from "@/lib/env";

/**
 * Client IP from trusted proxy headers. Behind Cloudflare + Vercel the order of trust is:
 * cf-connecting-ip (set by Cloudflare) -> x-real-ip / first x-forwarded-for (set by Vercel).
 * The raw IP is used only in memory (rate limits); anything stored or logged uses hashIp().
 * @param {Headers} headers
 */
export function clientIp(headers) {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "0.0.0.0";
}

/** Keyed hash of an IP so logs and DB never hold the raw address. */
export function hashIp(ip) {
  return hmac(ip || "unknown", authEnv.ipHashSalt).slice(0, 32);
}

/** Short, display-safe device label from a User-Agent (no fingerprinting detail stored). */
export function deviceLabel(userAgent = "") {
  const ua = String(userAgent).slice(0, 400);
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${os}`;
}
