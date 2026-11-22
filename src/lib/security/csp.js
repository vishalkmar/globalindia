/**
 * Content-Security-Policy (Phase 20). Pure functions, used by next.config.mjs and tests.
 *
 * - Pages are prerendered (Partial Prerendering), which Next documents as incompatible with per-request
 *   nonces. So the live policy has no nonce: 'self' plus the few third parties the site uses, with
 *   'unsafe-inline' kept only for Next's inline bootstrap scripts, and SRI hashes on script files.
 *   Pages show no user HTML except rich text sanitised on save and on render.
 * - The nonce + 'strict-dynamic' variant is kept (and tested) for the day the admin becomes fully dynamic.
 * - Both: no plugins, no <base> changes, forms post only to the site, no framing, and Trusted Types in
 *   report-only mode so a regression shows up in the CSP reports before it is enforced.
 */

const THIRD_PARTY = {
  script: ["https://challenges.cloudflare.com", "https://www.googletagmanager.com", "https://www.clarity.ms"],
  connect: ["https://challenges.cloudflare.com", "https://www.google-analytics.com", "https://*.google-analytics.com", "https://*.clarity.ms", "https://api.cloudinary.com"],
  img: ["https://res.cloudinary.com", "https://www.google-analytics.com", "https://*.clarity.ms"],
  frame: ["https://challenges.cloudflare.com", "https://www.google.com"],
};

const join = (directives) =>
  Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");

/**
 * @param {{ nonce?: string|null, dev?: boolean, reportUri?: string }} opts
 * @returns {string}
 */
export function buildCsp({ nonce = null, dev = false, reportUri = "/api/csp-report" } = {}) {
  const script = nonce
    ? ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...THIRD_PARTY.script]
    : ["'self'", "'unsafe-inline'", ...THIRD_PARTY.script];
  if (dev) script.push("'unsafe-eval'"); // React Refresh in development only
  return join({
    "default-src": ["'self'"],
    "script-src": script,
    "style-src": ["'self'", "'unsafe-inline'"], // Tailwind/theme variables and React style props
    "img-src": ["'self'", "data:", "blob:", ...THIRD_PARTY.img],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...THIRD_PARTY.connect, ...(dev ? ["ws:"] : [])],
    "frame-src": THIRD_PARTY.frame,
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    ...(dev ? {} : { "upgrade-insecure-requests": [] }),
    "report-uri": [reportUri],
  });
}

/** Trusted Types, report-only for now (Phase 20 todo 06). */
export function buildReportOnlyCsp({ reportUri = "/api/csp-report" } = {}) {
  return join({ "require-trusted-types-for": ["'script'"], "report-uri": [reportUri] });
}

/** 128-bit random nonce, base64. Works in the proxy (Web Crypto). */
export function makeNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
