#!/usr/bin/env node
/**
 * Secret scanner (Phase 24 todos 03, 08, 09, 17). No dependencies.
 *
 *   node scripts/scan-secrets.mjs --staged    files staged for commit (pre-commit hook)
 *   node scripts/scan-secrets.mjs --history   every line ever added in git history
 *   node scripts/scan-secrets.mjs --bundle    client JavaScript in .next/static after a build
 *
 * Looks for known key formats AND for the actual values of secrets in local .env* files (so a real
 * secret is caught even if it has no recognisable shape). Prints where, never the secret itself.
 * Exit code 1 when something is found. CI also runs gitleaks (.github/workflows/security.yml).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PATTERNS = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ["database URL with password", /postgres(?:ql)?:\/\/[^:\s/"'`]+:(?!postgres@|password@|\*\*\*|<)[^@\s"'`]{6,}@(?!127\.0\.0\.1|localhost)/],
  ["Brevo API key", /xkeysib-[a-f0-9]{40,}/],
  ["Cloudinary URL with secret", /cloudinary:\/\/\d+:[A-Za-z0-9_-]{20,}@/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{36,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Neon password", /npg_[A-Za-z0-9]{10,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{10,}/],
];

// Real values from local env files (never printed). Short or obviously public values are skipped.
const PUBLIC_KEYS = /^(NEXT_PUBLIC_|NODE_ENV|JWT_ISSUER|JWT_AUDIENCE|JWT_ACCESS_KID|SEED_ADMIN_EMAIL|BREVO_SENDER|E2E_)/;
const knownValues = [];
for (const f of readdirSync(".").filter((n) => /^\.env/.test(n) && n !== ".env.example")) {
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=["']?(.*?)["']?\s*$/);
    if (!m || PUBLIC_KEYS.test(m[1]) || m[2].length < 16) continue;
    if (/^(postgresql:\/\/postgres:postgres@127|http)/.test(m[2])) continue;
    knownValues.push({ name: m[1], value: m[2] });
    // A URL's password on its own is the secret part.
    const pw = m[2].match(/:\/\/[^:]+:([^@]{8,})@/);
    if (pw) knownValues.push({ name: `${m[1]} (password)`, value: decodeURIComponent(pw[1]) });
  }
}

const findings = [];
function scan(where, text) {
  for (const [label, re] of PATTERNS) if (re.test(text)) findings.push(`${where}: ${label}`);
  for (const { name, value } of knownValues) if (text.includes(value)) findings.push(`${where}: value of ${name}`);
}

const mode = process.argv[2] ?? "--staged";
const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
const SKIP = /(^|\/)(package-lock\.json|.*\.(png|jpe?g|webp|avif|gif|ico|pdf|woff2?|zip))$/;

if (mode === "--staged") {
  const files = git(["diff", "--cached", "--name-only", "--diff-filter=ACM"]).split("\n").filter(Boolean);
  for (const f of files) {
    if (SKIP.test(f)) continue;
    if (/(^|\/)\.env(?!\.example$)/.test(f)) {
      findings.push(`${f}: env file staged (these must stay out of git)`);
      continue;
    }
    scan(f, git(["show", `:${f}`]));
  }
} else if (mode === "--history") {
  const log = git(["log", "-p", "--all", "--no-color", "--unified=0", "--format=commit %H"]);
  let commit = "";
  let file = "";
  for (const line of log.split("\n")) {
    if (line.startsWith("commit ")) commit = line.slice(7, 15);
    else if (line.startsWith("+++ b/")) file = line.slice(6);
    else if (line.startsWith("+") && !line.startsWith("+++") && !SKIP.test(file)) scan(`${commit} ${file}`, line);
  }
} else if (mode === "--bundle") {
  const dir = join(".next", "static");
  if (!existsSync(dir)) {
    console.error("No build found. Run `npm run build` first.");
    process.exit(2);
  }
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(js|css|json|html|txt)$/.test(n)) scan(p, readFileSync(p, "utf8"));
    }
  };
  walk(dir);
  // Server-only env names must never appear in client code either.
  const names = ["JWT_ACCESS_SECRET", "REFRESH_PEPPER", "OTP_PEPPER", "MFA_PENDING_SECRET", "TOTP_ENC_KEY", "BREVO_API_KEY", "CLOUDINARY_API_SECRET", "TURNSTILE_SECRET", "UPSTASH_REDIS_REST_TOKEN", "DATABASE_URL", "CRON_SECRET"];
  const walkNames = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walkNames(p);
      else if (n.endsWith(".js")) {
        const t = readFileSync(p, "utf8");
        for (const name of names) if (t.includes(name)) findings.push(`${p}: mentions ${name}`);
      }
    }
  };
  walkNames(dir);
} else {
  console.error("Use --staged, --history or --bundle.");
  process.exit(2);
}

const unique = [...new Set(findings)];
if (unique.length) {
  console.error(`Possible secrets found (${unique.length}):`);
  for (const f of unique.slice(0, 50)) console.error(`  ${f}`);
  console.error("Remove them. If a real secret was ever committed or shipped, rotate it (docs/security/24.md).");
  process.exit(1);
}
console.log(`No secrets found (${mode.slice(2)}; ${knownValues.length} local secret values checked).`);
