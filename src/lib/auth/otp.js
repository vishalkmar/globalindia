import "server-only";

import { db } from "@/lib/db";
import { authEnv } from "@/lib/env";

import { hmac, randomDigits, safeEqual } from "./crypto";

/**
 * One-time codes sent by email (Security.md §3).
 * - 6 random digits (crypto), stored only as HMAC-SHA256 with OTP_PEPPER.
 * - Expires in 5 minutes, single use (consumedAt), max 5 wrong attempts then the code is burnt.
 * - Resend cooldown 60 s and at most 5 codes per hour per user and purpose.
 * - A new code burns every older unused code of the same purpose.
 * - The plain code is returned only to the caller that emails it — never to an API response or a log.
 */

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_PER_HOUR = 5;

export class OtpError extends Error {
  /** @param {"cooldown"|"hourly_limit"|"invalid"|"expired"|"burnt"} reason */
  constructor(reason, retryAfter = 0) {
    super(reason);
    this.reason = reason;
    this.retryAfter = retryAfter;
  }
}

const hashCode = (code, purpose, userId) => hmac(`${purpose}:${userId}:${code}`, authEnv.otpPepper);

/**
 * Create a code. Throws OtpError("cooldown"|"hourly_limit").
 * @returns {Promise<{ code: string, otp: { id: string, expiresAt: Date } }>}
 */
export async function issueOtp(userId, purpose, meta = undefined) {
  const now = Date.now();
  const recent = await db.otpCode.findMany({
    where: { userId, purpose, createdAt: { gt: new Date(now - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw new OtpError(
      "cooldown",
      Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - recent[0].createdAt.getTime())) / 1000),
    );
  }
  if (recent.length >= OTP_MAX_PER_HOUR) {
    const oldest = recent[recent.length - 1].createdAt.getTime();
    throw new OtpError("hourly_limit", Math.ceil((oldest + 60 * 60 * 1000 - now) / 1000));
  }

  const code = randomDigits(6);
  const otp = await db.$transaction(async (tx) => {
    await tx.otpCode.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date(now) },
    });
    return tx.otpCode.create({
      data: {
        userId,
        purpose,
        codeHash: hashCode(code, purpose, userId),
        expiresAt: new Date(now + OTP_TTL_MS),
        meta,
      },
      select: { id: true, expiresAt: true },
    });
  });
  return { code, otp };
}

/**
 * Check a code. On success the code is consumed (atomically) and its row is returned.
 * Throws OtpError("invalid"|"expired"|"burnt"). All failures map to one generic message in the API.
 * @param {{ otpId?: string }} [opts] restrict to a specific code (e.g. an MFA-toggle request)
 */
export async function verifyOtp(userId, purpose, code, { otpId } = {}) {
  const otp = await db.otpCode.findFirst({
    where: { userId, purpose, consumedAt: null, ...(otpId ? { id: otpId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) throw new OtpError("invalid");
  if (otp.expiresAt.getTime() <= Date.now()) {
    await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
    throw new OtpError("expired");
  }

  const attempts = otp.attempts + 1;
  const ok = safeEqual(hashCode(String(code), purpose, userId), otp.codeHash);
  if (!ok) {
    const burn = attempts >= OTP_MAX_ATTEMPTS;
    await db.otpCode.update({
      where: { id: otp.id },
      data: { attempts, ...(burn ? { consumedAt: new Date() } : {}) },
    });
    throw new OtpError(burn ? "burnt" : "invalid");
  }

  const claimed = await db.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: new Date(), attempts },
  });
  if (claimed.count !== 1) throw new OtpError("invalid"); // used in parallel
  return otp;
}

/** User-facing text for OtpError reasons (generic on purpose). */
export function otpErrorMessage(err) {
  if (err.reason === "cooldown") return `Please wait ${err.retryAfter} seconds before asking for a new code.`;
  if (err.reason === "hourly_limit") return "Too many codes requested. Please try again later.";
  if (err.reason === "burnt" || err.reason === "expired")
    return "This code can no longer be used. Ask for a new code.";
  return "That code is not correct.";
}
