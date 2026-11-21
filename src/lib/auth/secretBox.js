import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { authEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for secrets that must be readable again (authenticator secrets).
 * Format: v1.<iv>.<tag>.<ciphertext> (base64url). A fresh 96-bit IV per value; the auth tag
 * makes any tampering with the stored value fail loudly. Key: TOTP_ENC_KEY (32 bytes).
 * `aad` binds the ciphertext to its owner (user id), so a value copied to another row will not decrypt.
 */

export function seal(plaintext, aad = "") {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", authEnv.totpKey, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));
  const data = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function open(sealed, aad = "") {
  const [v, iv, tag, data] = String(sealed ?? "").split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Invalid sealed value");
  const decipher = createDecipheriv("aes-256-gcm", authEnv.totpKey, Buffer.from(iv, "base64url"));
  if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
