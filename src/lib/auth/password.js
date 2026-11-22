import "server-only";

import { hash, verify } from "@node-rs/argon2";

import { ARGON2_OPTIONS, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./argon-params";

/**
 * argon2id hashing (Phase 4 todo 01, hardened in Phase 25).
 */

// A real argon2id hash of a random throwaway value. Verifying against it when the user does not exist
// makes "unknown email" take the same time as "wrong password" (no user enumeration by timing).
let dummyHashPromise;
function dummyHash() {
  dummyHashPromise ??= hash(`dummy-${Math.random()}-${Date.now()}`, ARGON2_OPTIONS);
  return dummyHashPromise;
}

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length > PASSWORD_MAX_LENGTH)
    throw new Error("Invalid password input");
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password. Pass `null` as storedHash when the user was not found — the function still
 * performs a full argon2 verification so timing is the same, and returns false.
 */
export async function verifyPassword(storedHash, password) {
  if (typeof password !== "string" || password.length === 0 || password.length > PASSWORD_MAX_LENGTH) {
    await verify(await dummyHash(), "x").catch(() => false);
    return false;
  }
  const target = storedHash || (await dummyHash());
  let ok = false;
  try {
    ok = await verify(target, password);
  } catch {
    ok = false;
  }
  return Boolean(storedHash) && ok;
}

/** True when a stored hash was made with weaker/different parameters and should be re-hashed. */
export function needsRehash(storedHash) {
  const m = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(storedHash ?? "");
  if (!m) return true;
  const [, mem, time, par] = m.map(Number);
  return (
    mem !== ARGON2_OPTIONS.memoryCost ||
    time !== ARGON2_OPTIONS.timeCost ||
    par !== ARGON2_OPTIONS.parallelism
  );
}

/** Basic policy check; returns a user-facing message or null. Breached-password check is added in Phase 25. */
export function passwordPolicyError(password, { email } = {}) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase())) {
    return "Do not use your email name inside the password.";
  }
  if (/^(.)\1+$/.test(password)) return "Do not repeat a single character.";
  return null;
}
