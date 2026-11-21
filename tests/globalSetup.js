import { spawn } from "node:child_process";
import { createRequire } from "node:module";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

import { TEST_DB_PORT, TEST_DB_URL } from "./db-config.js";

/**
 * Starts a throw-away in-memory PostgreSQL (PGlite) for the test run and applies all migrations,
 * so database tests run against the real schema without touching dev data or Neon.
 */

export default async function setup() {
  const db = await PGlite.create("memory://");
  const server = new PGLiteSocketServer({ db, port: TEST_DB_PORT, host: "127.0.0.1", maxConnections: 10 });
  await server.start();

  const require = createRequire(import.meta.url);
  const prisma = require.resolve("prisma/build/index.js");
  // Async spawn: the PGlite server lives in this process, so the event loop must stay free.
  const res = await new Promise((resolve) => {
    const child = spawn(process.execPath, [prisma, "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: TEST_DB_URL, DIRECT_URL: TEST_DB_URL },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
  if (res.status !== 0) {
    await server.stop();
    throw new Error(`Test DB migration failed:\n${res.stdout}\n${res.stderr}`);
  }

  return async () => {
    await server.stop();
    await db.close();
  };
}
