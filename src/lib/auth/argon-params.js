/**
 * argon2id parameters (OWASP 2024+: m=64 MiB, t=3, p=1). Shared by the app and the seed script.
 * Changing these is safe: hashes made with older params are re-hashed on the next successful login.
 */
export const ARGON2_OPTIONS = Object.freeze({
  algorithm: 2, // Algorithm.Argon2id in @node-rs/argon2
  memoryCost: 65536, // KiB = 64 MiB
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
});

/** Password policy (Security.md, Phase 25). */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128; // bound the work an attacker can force on the hasher
