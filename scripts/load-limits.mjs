#!/usr/bin/env node
/**
 * Load test for the rate limits (Phase 22 todo 18). Run against a server you own:
 *   node scripts/load-limits.mjs http://localhost:3000
 * Sends bursts from one client and checks that each limit cuts in at the expected count with a
 * 429 and a Retry-After header. Never point it at someone else's site. Without Upstash the limits are
 * per server process, so run it against a single instance (next start), not a cluster.
 */

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const ip = `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`; // test range

async function burst(name, count, makeReq, expectedLimit) {
  const statuses = [];
  let retryAfter = null;
  for (let i = 0; i < count; i++) {
    const res = await makeReq(i);
    statuses.push(res.status);
    if (res.status === 429 && retryAfter === null) retryAfter = res.headers.get("retry-after");
    await res.arrayBuffer();
  }
  const firstLimited = statuses.indexOf(429);
  const ok = firstLimited === expectedLimit && retryAfter !== null;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name.padEnd(28)} first 429 at #${firstLimited + 1} (expected #${expectedLimit + 1}), Retry-After ${retryAfter ?? "missing"}`,
  );
  return ok;
}

const headers = { "x-forwarded-for": ip, "sec-fetch-site": "same-origin", origin: base };

// Auth POSTs need a CSRF token bound to the pre-login cookie (Phase 18).
const csrfRes = await fetch(`${base}/api/auth/csrf`, { headers });
const { token } = await csrfRes.json();
const preCookie = (csrfRes.headers.get("set-cookie") ?? "").split(";")[0];

const results = [
  await burst("public search (60/min)", 70, (i) => fetch(`${base}/api/public/search?q=sl${i % 3}`, { headers }), 60),
  await burst(
    "login per IP (5/15 min)",
    7,
    (i) =>
      fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json", "x-csrf-token": token, cookie: preCookie },
        body: JSON.stringify({ email: `load-${i}@example.invalid`, password: "not-a-real-password" }),
      }),
    5,
  ),
];

if (results.includes(false)) {
  console.log("\nSome limits did not cut in where expected (if limits were changed in Settings, adjust).");
  process.exit(1);
}
console.log("\nAll limits behaved as expected.");
