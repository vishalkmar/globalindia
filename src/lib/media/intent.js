import "server-only";

import { randomBytes } from "node:crypto";

import { hmac, safeEqual } from "@/lib/auth/crypto";
import { authEnv } from "@/lib/env";

import { PUBLIC_ID_RE } from "./constants";

/**
 * Upload intents: the server picks the storage id and signs exactly what may be uploaded.
 * The confirm step accepts only an intent it signed, for the same user, within 15 minutes —
 * so nobody can register an arbitrary file or someone else's upload as a media asset.
 */

export const INTENT_TTL_MS = 15 * 60 * 1000;

export function newMediaId() {
  return `gi_${randomBytes(16).toString("hex")}`;
}

const sign = (payload) => hmac(`media-intent:${payload}`, authEnv.refreshPepper);

/** @param {{ id: string, kind: 'image'|'pdf', userId: string, replaceId?: string|null, driver: string }} i */
export function createIntent({ id, kind, userId, replaceId = null, driver }) {
  const exp = Date.now() + INTENT_TTL_MS;
  const payload = [id, kind, userId, replaceId ?? "-", driver, exp].join("|");
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload)}`;
}

/** @returns {{ id: string, kind: string, userId: string, replaceId: string|null, driver: string } | null} */
export function readIntent(token, userId) {
  if (typeof token !== "string" || token.length > 600) return null;
  const [b64, mac] = token.split(".");
  if (!b64 || !mac) return null;
  let payload;
  try {
    payload = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!safeEqual(sign(payload), mac)) return null;
  const [id, kind, uid, replaceId, driver, exp] = payload.split("|");
  if (uid !== userId || Number(exp) < Date.now()) return null;
  if (!PUBLIC_ID_RE.test(id) || !["image", "pdf"].includes(kind) || !["cloudinary", "local"].includes(driver)) return null;
  return { id, kind, userId: uid, replaceId: replaceId === "-" ? null : replaceId, driver };
}
