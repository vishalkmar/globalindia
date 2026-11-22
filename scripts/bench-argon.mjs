#!/usr/bin/env node
/**
 * argon2id benchmark (Phase 25 todo 01): time to hash with the production parameters
 * (64 MiB, t=3, p=1). Aim: 150-600 ms on the server (slow for attackers, fine for one sign-in).
 *   node scripts/bench-argon.mjs
 */
import { hash, verify } from "@node-rs/argon2";

import { ARGON2_OPTIONS } from "../src/lib/auth/argon-params.js";

const runs = 5;
const times = [];
let h = "";
for (let i = 0; i < runs; i++) {
  const t = performance.now();
  h = await hash(`bench-password-${i}`, ARGON2_OPTIONS);
  times.push(performance.now() - t);
}
const t = performance.now();
await verify(h, `bench-password-${runs - 1}`);
const verifyMs = performance.now() - t;
times.sort((a, b) => a - b);
console.log(`argon2id m=${ARGON2_OPTIONS.memoryCost} KiB t=${ARGON2_OPTIONS.timeCost} p=${ARGON2_OPTIONS.parallelism}`);
console.log(`hash median ${times[Math.floor(runs / 2)].toFixed(0)} ms (min ${times[0].toFixed(0)}, max ${times.at(-1).toFixed(0)}), verify ${verifyMs.toFixed(0)} ms`);
