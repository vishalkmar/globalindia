import "server-only";

/**
 * Validated access to server-side environment variables.
 * Secrets are read lazily so a missing optional integration (Brevo, Cloudinary, Upstash)
 * only fails the feature that needs it, while auth secrets fail loudly.
 */

const MIN_SECRET_BYTES = 48; // base64url of 64 random bytes is ~86 chars; reject obviously weak values

function read(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Required value; throws a generic message (name only, never the value). */
export function requireEnv(name) {
  const value = read(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** Required secret with minimum length check. */
export function requireSecret(name, minBytes = MIN_SECRET_BYTES) {
  const value = requireEnv(name);
  if (Buffer.byteLength(value, "utf8") < minBytes) {
    throw new Error(`Environment variable ${name} is too short to be a safe secret`);
  }
  return value;
}

export function optionalEnv(name, fallback = undefined) {
  return read(name) ?? fallback;
}

export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export function siteUrl() {
  return optionalEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000").replace(/\/+$/, "");
}

export const authEnv = {
  get jwtSecret() {
    return requireSecret("JWT_ACCESS_SECRET");
  },
  get jwtIssuer() {
    return optionalEnv("JWT_ISSUER", "global-india");
  },
  get jwtAudience() {
    return optionalEnv("JWT_AUDIENCE", "global-india-admin");
  },
  get refreshPepper() {
    return requireSecret("REFRESH_PEPPER");
  },
  get otpPepper() {
    return requireSecret("OTP_PEPPER");
  },
  get mfaPendingSecret() {
    return requireSecret("MFA_PENDING_SECRET");
  },
  get ipHashSalt() {
    return requireSecret("IP_HASH_SALT", 16);
  },
  get totpKey() {
    const key = Buffer.from(requireEnv("TOTP_ENC_KEY"), "base64");
    if (key.length !== 32) throw new Error("TOTP_ENC_KEY must be 32 bytes (base64)");
    return key;
  },
};
