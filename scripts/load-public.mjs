#!/usr/bin/env node
/**
 * Load test for public pages (Phase 27 todo 18). Only against a server you own:
 *   node scripts/load-public.mjs http://localhost:3000 [seconds=20] [concurrency=64]
 * Cycles through the main public pages with a fixed number of parallel connections and reports
 * requests per second, latency percentiles and errors. The target in production is 500 rps through
 * Cloudflare (cached HTML); a single laptop measures the origin alone.
 */

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const seconds = Number(process.argv[3] ?? 20);
const concurrency = Number(process.argv[4] ?? 64);
const PATHS = ["/", "/products", "/about", "/contact", "/industries", "/insights", "/faq", "/quality", "/why-us"];

const latencies = [];
const statuses = new Map();
let errors = 0;
let i = 0;
const end = Date.now() + seconds * 1000;

async function worker() {
  while (Date.now() < end) {
    const path = PATHS[i++ % PATHS.length];
    const t = performance.now();
    try {
      const res = await fetch(`${base}${path}`, { headers: { "x-forwarded-for": `198.18.0.${i % 250}` } });
      await res.arrayBuffer();
      statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
      latencies.push(performance.now() - t);
    } catch {
      errors += 1;
    }
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const elapsed = (performance.now() - started) / 1000;
latencies.sort((a, b) => a - b);
const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor((p / 100) * latencies.length))]?.toFixed(0);
const total = latencies.length;
console.log(`${total} requests in ${elapsed.toFixed(1)} s with ${concurrency} connections`);
console.log(`throughput ${(total / elapsed).toFixed(0)} req/s`);
console.log(`latency p50 ${pct(50)} ms, p95 ${pct(95)} ms, p99 ${pct(99)} ms`);
console.log(`statuses ${JSON.stringify(Object.fromEntries(statuses))}, network errors ${errors}`);
const bad = [...statuses.entries()].filter(([s]) => s >= 500).reduce((n, [, c]) => n + c, 0);
process.exit(bad || errors ? 1 : 0);
