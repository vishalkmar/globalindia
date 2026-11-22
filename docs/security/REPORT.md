# Security report — Global India website and admin

Audience: the site owner and anyone auditing the site before launch. Date: 23 November 2026.
Covers Phases 17–30 of `docs/Phase.md`. Details per topic are in `docs/security/17.md` to `29.md`
and the ASVS checklist in `asvs-l2.md`.

## Summary

The site and admin panel have been hardened and tested against the OWASP Top 10 and ASVS Level 2.
All automated suites pass: **813 unit tests** (36 files) and **51 end-to-end browser tests**
(15 files). Coverage of the authentication and security code is **91 % of statements and 95 % of
lines**, enforced in CI. No secret has ever been committed; the client bundle contains none.

What still needs the owner (all need the live domain or an account):

1. Put the domain on **Cloudflare** and apply the WAF, bot, rate-limit and cache rules, plus the origin
   lock header (`docs/security/27.md`, `22.md`, `28.md`).
2. **Reset the Neon `neondb_owner` password** (it was pasted in a chat) and store it only in Vercel.
3. Add the **Brevo and Cloudinary webhooks** and turn on Cloudinary "Strict transformations" and
   "Restricted media types: PDF" (`26.md`, `27.md`, `28.md`).
4. Set every variable in Vercel as **Sensitive**, with different values for Preview and Production
   (`24.md`).
5. Run the **staging scans** below and the manual checklist in `asvs-l2.md`.
6. Decide: block AI crawlers? watermark product photos? (`28.md`)

## Automated suites (Phase 30 todos 01–11, 16, 17)

| Suite | Where |
|---|---|
| Auth, guards, validators (≥ 90 % coverage gate) | `npm run test:coverage`; `login`, `mfa`, `mfa-hardening`, `session`, `jwt`, `secrets`, `token-hygiene`, `coverage-auth` tests |
| Browser journeys: sign-in, email code, authenticator, recovery codes, password reset, logout, MFA change approval, step-up | `admin-auth.spec.mjs`, `password-reset.spec.mjs`, `theme-settings.spec.mjs`, `ui-surface.spec.mjs` |
| SQL injection payloads (classic, blind, time-based, stacked, operator injection) | `injection.test.js` |
| XSS payloads (stored, reflected, DOM, mutation, SVG, URL schemes) | `xss.test.js` |
| CSRF (missing/wrong token, other session, cross-site form, login CSRF) | `csrf.test.js`, `cors.spec.mjs` |
| IDOR / BFLA role matrix (every route × every method signed out; viewer × every write; editor × super-admin areas; id swapping) | `authz.test.js`, `viewer-write.test.js` |
| Rate limits (+ load script against a production build) | `abuse.test.js`, `scripts/load-limits.mjs` |
| JWT tampering (alg none, other algorithms, wrong iss/aud, expired, rotated keys, refresh reuse) | `jwt.test.js`, `token-hygiene.test.js`, `session.test.js` |
| Uploads (oversize, wrong type, polyglot, SVG, PDF with JavaScript, decompression bombs) | `media.test.js` |
| SSRF (private/metadata addresses, rebinding, redirects into private ranges, schemes, size, type, timeout) | `media.test.js`, `ssrf-fetch.test.js`, `webhooks.test.js` |
| Webhook forgery (bad signature, tampered body, stale, replayed, wrong IP) | `webhooks.test.js` |
| Fuzzing (40 seeded random payloads × 11 endpoints) | `fuzz.test.js` |
| UI surface (clickjacking, page-source secrets, storage, OTP in URLs, back after logout) | `ui-surface.spec.mjs`, `ui-surface.test.js` |
| Secret scan of history and built bundle | `npm run scan:secrets`, `npm run scan:bundle` (clean, 23 Nov 2026) |
| Dependency audit | `node scripts/audit-gate.mjs` (no unaccepted high/critical; Prisma CLI chain accepted until Prisma 7) |

CI (`.github/workflows/ci.yml`, `security.yml`) runs install from the lockfile, signature checks, the
audit gate, lint, unit tests, the build, the bundle scan and gitleaks on every push.

## Staging scans (todos 12–15) — to run once a staging URL exists

```bash
# OWASP ZAP baseline (passive) and full (active, staging only)
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://staging.example -r zap-baseline.html
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py -t https://staging.example -r zap-full.html
# Nuclei with the Next.js and exposure templates
nuclei -u https://staging.example -tags nextjs,exposure,misconfig,cve -severity medium,high,critical
```

Then check https://securityheaders.com, https://developer.mozilla.org/en-US/observatory and
https://www.ssllabs.com/ssltest/ for the domain. Expected: SSL Labs A+ (Cloudflare, TLS 1.2+, HSTS);
Observatory/securityheaders A, not A+, because the CSP keeps `'unsafe-inline'` for scripts (see below).
Record the results and any fixes in this section.

## Findings fixed during Phases 17–30 (todo 19)

| Finding | Fix |
|---|---|
| Search treated `%` and `_` as wildcards (slow queries, data probing) | LIKE escaping (`likeTerm`) |
| Sign-in forms sent no CSRF token (all auth POSTs failed once CSRF was enforced) | `postJson` sends and refreshes the token |
| Newsletter confirmation happened on GET (mail scanners confirmed people) | Confirm button + POST |
| 8 permission refusals inside handlers were not audited | `denyAccess()` for every refusal + burst alert |
| Revisions endpoints answered 400/404 to signed-out callers (id probing) | Auth checked before input |
| Enquiries visible to every editor | Optional "assigned only" scope everywhere |
| Unused `otpResendUser` limit; login IP limit 10 instead of 5; forms 6/10 min; uploads 60/h | Limits set to the spec |
| Lockout always 15 minutes | Exponential back-off to 24 h |
| Secrets shorter than 64 bytes and shared values accepted | 86-char minimum, distinct values enforced |
| No step-up for sensitive actions; no way to regenerate recovery codes; no idle timeout | Step-up dialog, regenerate button, 30-minute idle sign-out |
| Background poll kept idle sessions alive | Background requests never refresh |
| `/.env`, `/.git`, `*.map` not explicitly blocked | 404 in the proxy |
| Public PDF links pointed at permanent public URLs | `/d/<id>` with checks and 10-minute signed links |
| `effect` ReDoS advisory | npm override to 3.22.5 |
| Unused `dotenv` dependency | Removed |
| Internal `_blank` links without `rel` | Added in `Button` |

## Known limits and accepted risks

- **CSP `'unsafe-inline'` for scripts.** Prerendered pages cannot carry per-request nonces (Next.js
  documents this). Mitigations: SRI on every script file, no user HTML except sanitised rich text,
  Trusted Types in report-only, strict `default-src`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'`. Revisit if the admin becomes fully dynamic.
- **Trusted Types not enforced** yet: framework code in development still writes HTML; enforce once the
  CSP reports from production are clean.
- **Prisma CLI advisories** (`deepmerge-ts` via `@prisma/config`): build-time only; fixed by Prisma 7.
- **Rate limits without Upstash** are per server instance. Production must set the Upstash variables
  (shared limits); without them each Vercel instance counts on its own.
- Scraping of public content cannot be stopped entirely (`28.md`); it is slowed and made visible.
