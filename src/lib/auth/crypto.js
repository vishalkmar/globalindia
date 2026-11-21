import "server-only";

import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Cryptographically random URL-safe token (default 32 bytes = 256 bits). */
export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** HMAC-SHA256 hex digest. Used to store tokens/codes so a DB leak does not reveal them. */
export function hmac(value, pepper) {
  return createHmac("sha256", pepper).update(String(value), "utf8").digest("hex");
}

/** Constant-time string compare (returns false on length mismatch without leaking timing on content). */
export function safeEqual(a, b) {
  const ba = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba); // keep the work similar
    return false;
  }
  return timingSafeEqual(ba, bb);
}

/** Uniform random numeric code, e.g. 6-digit OTP (no modulo bias). */
export function randomDigits(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) out += String(randomInt(0, 10));
  return out;
}
