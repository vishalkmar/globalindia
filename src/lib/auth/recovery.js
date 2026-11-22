import "server-only";

import { randomInt } from "node:crypto";

import { db } from "@/lib/db";
import { authEnv } from "@/lib/env";

import { hmac } from "./crypto";

/**
 * Backup recovery codes (Phase 5 todo 08): 10 codes like "K7QMD-2WXPA", shown once,
 * stored only as HMAC hashes, each usable once. Generating a new set deletes the old set.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export const RECOVERY_CODE_COUNT = 10;

const normalise = (code) =>
  String(code)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
const hashCode = (userId, code) => hmac(`recovery:${userId}:${normalise(code)}`, authEnv.otpPepper);

function makeCode() {
  let s = "";
  for (let i = 0; i < 10; i++) s += ALPHABET[randomInt(0, ALPHABET.length)];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/** @returns {Promise<string[]>} plain codes — show once, never store or log them */
export async function regenerateRecoveryCodes(userId, tx = db) {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, makeCode);
  await tx.recoveryCode.deleteMany({ where: { userId } });
  await tx.recoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hashCode(userId, c) })) });
  return codes;
}

/** Consume a recovery code. Returns true once per code. */
export async function useRecoveryCode(userId, code) {
  const res = await db.recoveryCode.updateMany({
    where: { userId, codeHash: hashCode(userId, code), usedAt: null },
    data: { usedAt: new Date() },
  });
  return res.count === 1;
}

export async function remainingRecoveryCodes(userId) {
  return db.recoveryCode.count({ where: { userId, usedAt: null } });
}
