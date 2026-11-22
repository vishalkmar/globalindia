# OWASP ASVS 4.0.3 Level 2 — checklist

Audience: an auditor or pentester reviewing the Global India site and admin. Date: 23 November 2026.
Status: **Met**, **Partly** (with the reason), or **N/A**. Evidence points to code, tests or the phase
documents in this folder.

| Chapter | Requirement area | Status | Evidence |
|---|---|---|---|
| V1 Architecture | Threat model, trust boundaries, single auth/authorization layer, server-side enforcement | Met | `docs/Security.md`, `docs/Architecture.md`; `guard.js` (`requireAdmin`, `requirePermission`, `denyAccess`); proxy is UX only |
| V2 Authentication | 12–128 char passwords, breached-password check, no composition rules, argon2id, MFA for all admins, lockout with back-off, generic errors, credential recovery by email link, notifications | Met | Phases 4, 5, 22, 23, 25; `login.js`, `breached.js`, `otp.js`, `totp.js`, `recovery.js` |
| V3 Session management | Server-side sessions (refresh family), rotation and reuse detection, 10-min access token, idle 30 min, absolute 12 h, logout everywhere, HttpOnly/Secure/SameSite=Strict/`__Host-` cookies, re-auth (step-up) for sensitive actions | Met | `session.js`, `cookies.js`, `stepUp.js`, `mfa-hardening.test.js` |
| V4 Access control | Deny by default, role matrix, object-level scoping (enquiries), no client-supplied roles, audited denials with burst alert, step-up | Met | Phase 21, `authz.test.js`, `viewer-write.test.js` |
| V5 Validation, sanitisation, encoding | Strict Zod schemas on every input, allow-list rich text sanitiser, output encoding by React, JSON-LD escaping, no `eval`, parameterised queries only, LIKE escaping, prototype-pollution guard, SSRF-safe fetch | Met | Phases 17, 19, 20, 26; `injection.test.js`, `xss.test.js`, `fuzz.test.js`, `ssrf-fetch.test.js` |
| V6 Stored cryptography | Only hashes for tokens/codes, AES-256-GCM for TOTP secrets, 64-byte distinct secrets, key ids for rotation, CSPRNG everywhere | Met | `crypto.js`, `secretBox.js`, `env.js`, `docs/security/23.md` |
| V7 Errors and logging | Generic errors, no stacks, structured redacted logs, hashed IPs, audit log of security events, retention | Met | `http.js` `route()`, `logger.js`, `audit.js`, `retention.js` |
| V8 Data protection | No sensitive data in URLs, storage or caches (`no-store` on admin/API), minimal personal data, export audited, retention | Met | Phase 29 `ui-surface.spec.mjs`, Phase 24 |
| V9 Communications | TLS everywhere (Vercel/Cloudflare), HSTS preload-ready, outgoing calls https only | Partly | Code side met; SSL Labs A+ and HSTS preload submission need the live domain (owner) |
| V10 Malicious code | No dynamic code from input, dependency audit gate, lockfile + signatures, secret scanning, SRI | Met | Phase 24, 27; `audit-gate.mjs`, `scan-secrets.mjs`, CI |
| V11 Business logic | Rate limits per flow, anti-automation (Turnstile, honeypot, time-to-submit), email bombing cap, sequential step enforcement (MFA ticket, email-change steps) | Met | Phase 14, 22, 25 |
| V12 Files and resources | Magic-byte checks, type allow-list, size caps, SVG/active-PDF refused, random names, no path traversal, SSRF guard on URL uploads, documents through short-lived links | Met | Phase 7, 19, 26, 28 |
| V13 API and web services | Same-origin only, no CORS grants, CSRF tokens, JSON content-type enforced, strict schemas, webhook signatures with replay protection | Met | Phase 18, 20, 26 |
| V14 Configuration | Security headers (CSP, COOP, CORP, XFO, Referrer-Policy, Permissions-Policy), no source maps, no framework banner, origin lock, dependency updates | Partly | Code side met; CSP keeps `'unsafe-inline'` for scripts because prerendered pages cannot carry nonces (decision in `20.md`, mitigated by SRI + Trusted Types report-only); live header grade needs the domain |

## Manual pentest checklist (to run on staging)

1. Sign-in: user enumeration by message/timing; lockout and back-off; OTP brute force; MFA ticket reuse.
2. Session: cookie flags; fixation (session id changes at login); logout everywhere; idle and absolute expiry.
3. Access: every admin API with a viewer, an editor and no session; swap ids (IDOR); hidden UI actions.
4. Input: SQLi/XSS payload lists on every form and query string; rich text; file uploads (polyglots,
   oversize, SVG, PDF with JavaScript); URL upload pointing at internal addresses.
5. CSRF: cross-site form and fetch to every unsafe endpoint; login CSRF.
6. Headers/TLS: securityheaders.com, Mozilla Observatory, SSL Labs.
7. Business logic: enquiry spam, newsletter abuse, rate-limit bypass with header spoofing
   (`X-Forwarded-For` is only trusted behind Cloudflare/Vercel).
8. Webhooks: forged, stale and replayed events.

Every item above also has an automated test in `tests/` (see `REPORT.md`).
