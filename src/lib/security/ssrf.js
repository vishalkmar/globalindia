import "server-only";

import { lookup } from "node:dns";
import { request } from "node:https";
import { isIP } from "node:net";

/**
 * SSRF-safe fetch (Phase 7 todo 05, Phase 26 todo 10-12, 16-17).
 * - https only, standard port only, no credentials in the URL.
 * - Every DNS answer is checked; private, loopback, link-local, CGNAT, multicast, reserved and cloud
 *   metadata addresses are refused. The check happens INSIDE the socket's DNS lookup, so the address
 *   that is checked is the address that is connected to (no DNS-rebinding gap).
 * - At most 2 redirects, each re-validated. 5 s timeout. Body capped at maxBytes while streaming.
 * - Optional content-type allow-list.
 */

export class SafeFetchError extends Error {}

const MAX_REDIRECTS = 2;

function ipv4ToInt(ip) {
  return ip.split(".").reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

const V4_BLOCKS = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // includes 169.254.169.254 cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
].map(([base, bits]) => [ipv4ToInt(base), bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0]);

/** @returns {boolean} true when the address must not be contacted */
export function isBlockedAddress(address) {
  const v = isIP(address);
  if (v === 4) {
    const n = ipv4ToInt(address);
    return V4_BLOCKS.some(([base, mask]) => (n & mask) === (base & mask));
  }
  if (v === 6) {
    const a = address.toLowerCase();
    if (a === "::" || a === "::1") return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(a)) return true; // hex-form mapped v4: refuse
    const first = parseInt(a.split(":")[0] || "0", 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((first & 0xff00) === 0xff00) return true; // multicast
    if (a.startsWith("64:ff9b:") || a.startsWith("2001:db8:") || a.startsWith("100::")) return true;
    return false;
  }
  return true;
}

/** Validates the URL shape before any network activity. */
export function assertSafeUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new SafeFetchError("That is not a valid web address.");
  }
  if (url.protocol !== "https:") throw new SafeFetchError("Only https:// links are allowed.");
  if (url.username || url.password)
    throw new SafeFetchError("Links with a user name or password are not allowed.");
  if (url.port && url.port !== "443") throw new SafeFetchError("Only the standard https port is allowed.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && isBlockedAddress(host)) throw new SafeFetchError("That address is not allowed.");
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(host)) {
    throw new SafeFetchError("That address is not allowed.");
  }
  return url;
}

/** DNS lookup that refuses blocked addresses — used by the socket itself. */
function guardedLookup(hostname, options, callback) {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family }];
    const bad = list.find((a) => isBlockedAddress(a.address));
    if (bad || !list.length) return callback(new SafeFetchError("That address is not allowed."));
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

function once(url, { timeoutMs, maxBytes, accept }) {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        headers: {
          "user-agent": "GlobalIndia-MediaFetch/1.0",
          accept: accept.length ? accept.join(", ") : "*/*",
        },
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ redirect: new URL(res.headers.location, url).toString() });
        }
        if (status !== 200) {
          res.resume();
          return reject(new SafeFetchError(`The link answered with status ${status}.`));
        }
        const type = String(res.headers["content-type"] ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        if (accept.length && !accept.includes(type)) {
          res.resume();
          return reject(new SafeFetchError("The link does not point to an allowed file type."));
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (declared > maxBytes) {
          res.resume();
          return reject(new SafeFetchError("The file at that link is too large."));
        }
        const chunks = [];
        let size = 0;
        res.on("data", (c) => {
          size += c.length;
          if (size > maxBytes) {
            req.destroy();
            reject(new SafeFetchError("The file at that link is too large."));
          } else chunks.push(c);
        });
        res.on("end", () =>
          resolve({ body: Buffer.concat(chunks), contentType: type, finalUrl: url.toString() }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new SafeFetchError("The link took too long to answer.")));
    req.on("error", (e) =>
      reject(e instanceof SafeFetchError ? e : new SafeFetchError("The link could not be reached.")),
    );
    req.end();
  });
}

/**
 * @param {string} rawUrl
 * @param {{ maxBytes?: number, timeoutMs?: number, accept?: string[] }} [opts]
 * @returns {Promise<{ body: Buffer, contentType: string, finalUrl: string }>}
 */
export async function safeFetch(rawUrl, { maxBytes = 10 * 1024 * 1024, timeoutMs = 5000, accept = [] } = {}) {
  let url = assertSafeUrl(rawUrl);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await once(url, { timeoutMs, maxBytes, accept });
    if (!res.redirect) return res;
    url = assertSafeUrl(res.redirect);
  }
  throw new SafeFetchError("The link redirects too many times.");
}
