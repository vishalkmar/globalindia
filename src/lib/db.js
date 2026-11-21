import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton (server-only).
 * In development, Next.js hot reload would otherwise create a new client (and pool) on every edit.
 * Query logging never includes parameter values, so no secrets or personal data reach the logs.
 */
const globalForPrisma = globalThis;

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    errorFormat: "minimal",
  });
}

export const db = globalForPrisma.__giPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__giPrisma = db;
