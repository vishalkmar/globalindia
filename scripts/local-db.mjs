#!/usr/bin/env node
/**
 * Local development PostgreSQL without Docker or a Neon account:
 * runs PGlite (real Postgres compiled to WASM) behind a Postgres wire-protocol socket.
 *
 *   npm run db:local            -> persistent DB in ./.pglite on 127.0.0.1:5433
 *   npm run db:local -- --memory -> throwaway in-memory DB (used by tests)
 *
 * Set in .env.local:
 *   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&connection_limit=1&pgbouncer=true"
 *   DIRECT_URL  = same value
 * Production and previews always use Neon.
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const memory = process.argv.includes("--memory");
const portArg = process.argv.find((a) => a.startsWith("--port="));
const port = portArg ? Number(portArg.split("=")[1]) : 5433;

const db = await PGlite.create(memory ? "memory://" : "./.pglite");
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.log(`Local PGlite Postgres listening on 127.0.0.1:${port} (${memory ? "in-memory" : "./.pglite"})`);

const shutdown = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
