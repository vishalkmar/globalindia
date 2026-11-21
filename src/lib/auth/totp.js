import { createHmac, randomBytes } from "node:crypto";

/**
 * TOTP (RFC 6238) / HOTP (RFC 4226) — own small implementation instead of a dependency
 * (supply-chain lesson, Security.md §5). Verified against the RFC 6238 test vectors in tests/unit/totp.test.js.
 * Compatible with Google Authenticator, Microsoft Authenticator, Authy, 1Password: SHA-1, 6 digits, 30 s.
 *
 * No "server-only" import: the math is pure and the E2E test uses it to act as an authenticator app.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_PERIOD = 30;
export const TOTP_DIGITS = 6;

export function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 160-bit random secret, base32 (what the user types or scans). */
export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function hotp(secretBuf, counter, digits = TOTP_DIGITS) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", secretBuf).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export function currentStep(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / TOTP_PERIOD);
}

/** Code for a base32 secret at a given time (used by tests / E2E acting as the phone app). */
export function totpCode(secretBase32, nowMs = Date.now()) {
  return hotp(base32Decode(secretBase32), currentStep(nowMs));
}

/**
 * Verify a code within ±window steps (default 1 = 30 s clock drift each way).
 * Replay protection: codes at or before `lastStep` are refused.
 * @returns {number|null} the matched time-step (store it as the new lastStep) or null
 */
export function verifyTotp(secretBase32, code, { window = 1, lastStep = null, nowMs = Date.now() } = {}) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const secret = base32Decode(secretBase32);
  const now = currentStep(nowMs);
  let matched = null;
  for (let w = -window; w <= window; w++) {
    const step = now + w;
    // Compare every candidate (no early exit) to keep timing flat.
    if (hotp(secret, step) === String(code) && matched === null) matched = step;
  }
  if (matched === null) return null;
  if (lastStep !== null && lastStep !== undefined && matched <= lastStep) return null;
  return matched;
}

/** otpauth:// URI for the QR code. Label shows "Global India (email)" in the app. */
export function otpauthUri({ secret, account, issuer = "Global India" }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_PERIOD) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
