#!/usr/bin/env node
/**
 * Runs the Prisma CLI with variables from .env.local (Prisma only reads .env by default).
 * Usage: node scripts/prisma.mjs <prisma args...>
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const envFile = resolve(process.cwd(), ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const require = createRequire(import.meta.url);
const prismaBin = require.resolve("prisma/build/index.js");
// Arguments come from package.json scripts only; spawned without a shell.
const result = spawnSync(process.execPath, [prismaBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
