#!/usr/bin/env node
/**
 * Creates .env.local with fresh random secrets for local development.
 * Never overwrites an existing .env.local unless --force is passed.
 * Usage: npm run secrets [-- --force]
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), ".env.local");
const force = process.argv.includes("--force");

if (existsSync(target) && !force) {
  console.log(".env.local already exists. Use --force to regenerate (this logs out every session).");
  process.exit(0);
}

const b64 = (n) => randomBytes(n).toString("base64url");
const template = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");

const generated = {
  JWT_ACCESS_SECRET: b64(64),
  JWT_ISSUER: "global-india",
  JWT_AUDIENCE: "global-india-admin",
  REFRESH_PEPPER: b64(64),
  OTP_PEPPER: b64(64),
  TOTP_ENC_KEY: randomBytes(32).toString("base64"),
  MFA_PENDING_SECRET: b64(64),
  IP_HASH_SALT: b64(32),
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  BREVO_SENDER_NAME: "Global India",
  SEED_ADMIN_EMAIL: "admin@globalindia.local",
  SEED_ADMIN_PASSWORD: `Gi-${b64(12)}`,
};

const out = template
  .split(/\r?\n/)
  .map((line) => {
    const m = line.match(/^([A-Z0-9_]+)=/);
    if (!m) return line;
    const key = m[1];
    return key in generated ? `${key}=${generated[key]}` : `${key}=`;
  })
  .join("\n");

writeFileSync(target, out, { mode: 0o600 });
console.log("Created .env.local with random secrets.");
console.log("Seed admin email:    " + generated.SEED_ADMIN_EMAIL);
console.log("Seed admin password: stored in .env.local (SEED_ADMIN_PASSWORD) — change it on first login.");
