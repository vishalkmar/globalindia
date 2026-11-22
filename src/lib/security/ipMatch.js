/**
 * IP addresses and CIDR ranges (Phase 22 todo 13). Pure functions, no Node APIs: used by the settings
 * schema (browser and server) and by the proxy.
 */

function v4ToBig(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0n;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255 || (p.length > 1 && p.startsWith("0"))) return null;
    n = (n << 8n) | BigInt(Number(p));
  }
  return n;
}

function v6ToBig(ip) {
  let s = ip.toLowerCase();
  if (s.includes("%")) return null; // zone ids are not addresses we block
  // IPv4-mapped tail (::ffff:1.2.3.4)
  const v4tail = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (v4tail) {
    const n = v4ToBig(v4tail[2]);
    if (n === null) return null;
    s = `${v4tail[1]}${(n >> 16n).toString(16)}:${(n & 0xffffn).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  let n = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    n = (n << 16n) | BigInt(parseInt(g, 16));
  }
  return n;
}

/** @returns {{ v: 4|6, n: bigint } | null} */
export function parseIp(ip) {
  const s = String(ip ?? "").trim();
  if (!s || s.length > 45) return null;
  if (s.includes(":")) {
    const n = v6ToBig(s);
    if (n === null) return null;
    // Treat IPv4-mapped IPv6 as the IPv4 address it carries.
    if (n >> 32n === 0xffffn) return { v: 4, n: n & 0xffffffffn };
    return { v: 6, n };
  }
  const n = v4ToBig(s);
  return n === null ? null : { v: 4, n };
}

/** "1.2.3.4", "1.2.3.0/24", "2001:db8::/32" -> { v, n, bits } or null. */
export function parseRange(entry) {
  const [addr, bitsRaw, extra] = String(entry ?? "").trim().split("/");
  if (extra !== undefined) return null;
  const ip = parseIp(addr);
  if (!ip) return null;
  const max = ip.v === 4 ? 32 : 128;
  if (bitsRaw !== undefined && !/^\d{1,3}$/.test(bitsRaw)) return null;
  const bits = bitsRaw === undefined ? max : Number(bitsRaw);
  // Very wide ranges would block whole countries or everyone; refuse them.
  if (bits > max || bits < (ip.v === 4 ? 8 : 16)) return null;
  return { v: ip.v, n: ip.n, bits };
}

export const isValidRange = (entry) => parseRange(entry) !== null;

/** Does `ip` fall in any of the ranges (strings)? Invalid entries are ignored. */
export function ipInRanges(ip, ranges) {
  const a = parseIp(ip);
  if (!a) return false;
  for (const r of ranges) {
    const range = typeof r === "string" ? parseRange(r) : r;
    if (!range || range.v !== a.v) continue;
    const shift = BigInt((a.v === 4 ? 32 : 128) - range.bits);
    if (a.n >> shift === range.n >> shift) return true;
  }
  return false;
}
