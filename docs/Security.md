# Security.md — Global India Website

Security phases 17–30 in Phase.md follow this file. Every rule here must be implemented in code and covered by a test in Phase 30. Each security phase writes its findings to `docs/security/<phase>.md`.

## 1. Requested items → phase map

| Requested item (owner's list) | Phase |
|---|---|
| All types of SQL injection and vulnerabilities | 17 |
| CSRF protection (all types) | 18 |
| Validate everything, file uploads | 19 |
| Block CORS, cross-site scripting, tighter CORS settings | 20 |
| Broken object / function level authorization, enforce permissions server side | 21 |
| Rate limiting and related protections | 22 |
| Secure JWT secrets, remove auth tokens from localStorage, OTP rules | 23 |
| Keep API secrets server side, remove exposed source maps and .env, keep sensitive data out of logs | 24 |
| Hash passwords and secrets, multi-factor authentication and authorization | 25 |
| Verify webhook signatures, check for SSRF | 26 |
| Update vulnerable dependencies, CDN, WAF, DDoS/DoS protection | 27 |
| Anti-bot / anti-scraping (challenge page), famous historic CVEs | 28 |
| UI attack-surface check | 29 |
| Full security testing phase (last) | 30 |

## 2. Admin authentication rules

1. Login, logout, refresh and every check happen in backend API routes. The browser never decides if someone is logged in.
2. Two factors: email OTP (Brevo) and authenticator app (TOTP). Both can be on; at least one is mandatory.
3. The default super-admin email is fixed in settings. Turning MFA on or off for any account first sends an OTP to that default email; the change applies only after the code is entered. A third person with a stolen password cannot change MFA.
4. Changing the default email needs current password + OTP to the old email + confirmation link on the new email.
5. Every security change sends an alert email and writes to AuditLog.

## 3. OTP rules

| Rule | Implementation |
|---|---|
| Never show OTP in API response | Response is only `{ ok: true, next: "verify" }` |
| OTP expires | 5 minutes; `expiresAt` checked server side |
| Single use | `consumedAt` set on success; reused code fails |
| Limited attempts | 5 per code, then code is burnt |
| Stored hashed | HMAC-SHA256 with `OTP_PEPPER` |
| Resend cooldown | 60 seconds, max 5 per hour |
| No enumeration | Unknown email gets the same message: "If the account exists, a code has been sent." |
| Not in logs or URLs | Logger redacts otp/code; codes only in POST body |

## 4. JWT and session mistakes we will never make

| Mistake | Our rule |
|---|---|
| JWT decoded but never verified | `jwtVerify()` with key, alg list, iss, aud on every request |
| Refresh token never rotated | New refresh token on every refresh; old revoked; reuse revokes whole family |
| Token kept in localStorage | Only httpOnly, Secure, SameSite=Strict cookies |
| Reset link works twice | Token hashed, `usedAt` set, 15-minute expiry |
| Email change without password or OTP | Requires password + OTP + new-email confirmation |
| Old session alive after reset | `tokenVersion++` and all sessions revoked on reset or password change |
| alg: none / algorithm confusion | Algorithm pinned in verify options |
| Long-lived access token | 10 minutes |
| Same secret in every environment | Unique ≥64-byte secrets per environment, rotation with `kid` |

## 5. Historic CVE lessons applied

| CVE / incident | What happened | Our protection |
|---|---|---|
| CVE-2025-29927 | Next.js middleware auth bypass via `x-middleware-subrequest` | Patched Next.js; strip header at Cloudflare; auth checked inside every route |
| CVE-2025-55182 / CVE-2025-66478 | RCE in React Server Components ("React2Shell") | Patched React and Next.js; monthly CVE review |
| CVE-2024-34351 | SSRF through Server Actions Host header | Patched; never build redirects from Host header; safeFetch |
| CVE-2024-46982 | Next.js cache poisoning | Patched; no-store on dynamic and admin routes |
| CVE-2022-23529 family | jsonwebtoken key/algorithm flaws | Use jose, pinned algorithms, strong keys |
| Prototype pollution (lodash, minimist) | `__proto__` keys change behaviour | Zod strict schemas; reject dangerous keys; patched deps |
| Log4Shell (CVE-2021-44228) | Strings in logs evaluated as code | Logs are plain data; never evaluate input |
| event-stream, xz-utils | Malicious dependency code | Lockfile, `npm ci`, provenance checks, minimal deps |
| ImageTragick-style uploads | Crafted images run code in image tools | No local image processing; Cloudinary re-encodes; magic-byte checks |

## 6. About protecting HTML and source code

No website can stop a person from seeing the HTML their own browser receives. What we do (Phase 28): stop automated bulk scraping with Cloudflare Bot Management and Managed Challenge (a verification/puzzle page like AWS WAF CAPTCHA on large travel sites), Turnstile on forms and downloads, rate-based challenges, no open JSON APIs, no source maps, server-only secrets, signed expiring links for documents and watermarked images. Business logic stays on the server, so nothing valuable is in the HTML.

## 7. Security headers checklist

| Header | Value |
|---|---|
| Content-Security-Policy | nonce-based, strict-dynamic, object-src 'none', frame-ancestors 'none' |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |
| Cross-Origin-Opener-Policy | same-origin |
| X-Robots-Tag (admin) | noindex, nofollow |
