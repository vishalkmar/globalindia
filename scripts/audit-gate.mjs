#!/usr/bin/env node
/**
 * Dependency gate (Phase 27 todo 01). Fails on any high or critical advisory, except the ones listed
 * in ACCEPTED with a written reason (docs/security/27.md). Review this list on every Prisma upgrade.
 *   node scripts/audit-gate.mjs
 */
import { execFileSync } from "node:child_process";

const ACCEPTED = {
  // Prisma CLI only (migrate / generate run at build time on our own schema and config). Fixed in
  // Prisma 7, a breaking upgrade planned separately. Not loaded by the running site.
  "deepmerge-ts": "prisma CLI config merge, no user input",
  "@prisma/config": "prisma CLI",
  prisma: "prisma CLI",
};

let report;
try {
  report = execFileSync("npm", ["audit", "--json"], { encoding: "utf8", shell: process.platform === "win32" });
} catch (err) {
  report = err.stdout; // npm audit exits non-zero when it finds anything
}
const { vulnerabilities = {} } = JSON.parse(report || "{}");
const blocking = Object.values(vulnerabilities).filter(
  (v) => ["high", "critical"].includes(v.severity) && !ACCEPTED[v.name],
);
for (const v of Object.values(vulnerabilities)) {
  if (ACCEPTED[v.name]) console.log(`accepted  ${v.severity.padEnd(8)} ${v.name} (${ACCEPTED[v.name]})`);
}
if (blocking.length) {
  for (const v of blocking) console.error(`BLOCKING  ${v.severity.padEnd(8)} ${v.name}`);
  process.exit(1);
}
console.log("No unaccepted high or critical advisories.");
