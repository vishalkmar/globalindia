# Architecture.md — Global India Website

## 1. High-level picture

```
Browser
  → Cloudflare (DNS, CDN, WAF, Bot Management, Managed Challenge, Turnstile)
    → Vercel (Next.js 16 App Router, Node runtime)
        → Neon PostgreSQL (pooled connection)
        → Cloudinary (signed uploads, delivery CDN)
        → Brevo (transactional email, webhooks)
        → Upstash Redis (rate limits, OTP attempt counters, blocklist)
```

Rendering: public pages are Server Components with ISR (tag-based cache + on-demand `revalidateTag` when admin saves). Admin panel is fully dynamic, never cached, `noindex`.

## 2. Folder structure (JavaScript only)

```
globalindia/
  docs/                 Memory.md Phase.md Design.md Architecture.md Content.md Security.md security/
  prisma/               schema.prisma  migrations/  seed.js  seed-data/
  public/               favicon, static images (no source maps)
  scripts/              check-emoji.js, scan-bundle-secrets.js, etc.
  src/
    app/
      (site)/           layout.jsx page.jsx about/ products/ [category]/ [slug]/
                        industries/ why-us/ quality/ insights/ contact/ legal/
      admin/            login/ verify/ setup/ reset/ (panel)/dashboard pages products
                        categories media enquiries theme settings users audit security
      api/
        auth/           login verify-otp verify-totp resend-otp refresh logout logout-all
                        reset/request reset/confirm mfa/* email-change/* sessions
        admin/          resource routes (all guarded)
        public/         enquiry newsletter search
        webhooks/       brevo cloudinary
      styleguide/       dev-only component gallery
      sitemap.js robots.js
    components/
      site/             TopBar Header MegaMenu Footer Hero StatsStrip ...
      admin/            DataTable FormBuilder MediaPicker ThemeEditor ...
      ui/               Button Card Input Select Badge Dialog Tabs ...
    hooks/              useReveal useCountUp ...
    lib/
      db.js             Prisma singleton (server-only)
      env.js            validated server env (server-only)
      auth/             jwt.js tokens.js session.js cookies.js otp.js totp.js crypto.js
                        password.js guard.js recovery.js mfa.js
      security/         rateLimit.js csrf.js sanitize.js ssrf.js headers.js ip.js
      validation/       zod schemas per resource
      cloudinary.js brevo.js audit.js logger.js seo.js theme.js
    proxy.js            (Next 16 name for middleware) headers, coarse /admin redirect only
  tests/
    unit/               Vitest
    e2e/                Playwright
```

Rule: everything in `lib/auth`, `lib/security`, `lib/db.js`, `lib/env.js`, `cloudinary.js`, `brevo.js` starts with `import "server-only";`.

## 3. Database (Prisma models)

| Model | Key fields |
|---|---|
| AdminUser | id (cuid), email (unique, lowercase), name, passwordHash (argon2id), role (SUPER_ADMIN/EDITOR/VIEWER), status, totpSecretEnc, totpEnabled, totpLastStep, emailOtpEnabled, mustChangePassword, failedLogins, lockedUntil, passwordChangedAt, tokenVersion, lastLoginAt |
| Session | id, userId, refreshTokenHash (unique), familyId, userAgent, ipHash, createdAt, lastUsedAt, expiresAt, absoluteExpiresAt, revokedAt, revokeReason, replacedById |
| OtpCode | id, userId, purpose (LOGIN/MFA_TOGGLE/EMAIL_CHANGE/RESET), codeHash, expiresAt (5 min), attempts, consumedAt, meta |
| PasswordResetToken | id, userId, tokenHash, expiresAt (15 min), usedAt |
| EmailChangeRequest | id, userId, newEmail, tokenHash, otpVerifiedAt, expiresAt, usedAt |
| RecoveryCode | id, userId, codeHash, usedAt |
| SiteSetting | key (unique) / value JSON — business, header, footer, topbar, social, seo, uploads, security |
| Theme | id, name, slug, isActive, mode (LIGHT/DARK), tokens JSON, createdById |
| Page / Section | Page: slug, title, status, seo; Section: pageId, type, order, data JSON, isVisible |
| Revision | entity, entityId, data JSON, authorId (last 20 per entity) |
| MenuItem | tree: menu (HEADER/MEGA/FOOTER_*), parentId, label, href, order |
| ProductCategory | slug, name, family (enum), intro, imageId, order, seo |
| Product | slug, name, categoryId, casNo, grade, purity, form, packSizes[], moq, shelfLife, dispatchTime, applications[], specs JSON, faqs JSON, content JSON, brandNote, isSourced, showPrice, indicativePrice, featured, status, seo, deletedAt |
| ProductDocument | productId, type (COA/SDS/TDS/OTHER), mediaId |
| Industry, Post, Testimonial, ClientLogo, GalleryItem, Faq, TimelineEntry | content models |
| MediaAsset | publicId, url, type, format, bytes, width, height, alt, folder, uploadedById, sourceUrl |
| Enquiry / EnquiryNote | type (QUOTE/CONTACT/SAMPLE/CALLBACK), name, company, email, phone, city, productIds, quantity, message, status, assignedToId, ipHash |
| Redirect | fromPath, toPath, statusCode |
| AuditLog | actorId, action, entity, entityId, diff JSON (secrets stripped), ipHash, at |
| WebhookEvent | provider, eventId (unique), receivedAt |
| NewsletterSubscriber | email, status, confirmTokenHash |

All queries go through Prisma (parameterised). Raw SQL only via `Prisma.sql` tagged templates.

### ER overview

```
AdminUser 1─* Session          AdminUser 1─* OtpCode        AdminUser 1─* RecoveryCode
AdminUser 1─* PasswordResetToken  AdminUser 1─* EmailChangeRequest  AdminUser 1─* AuditLog
Page 1─* Section               MenuItem 1─* MenuItem (parent/children)
ProductCategory 1─* Product    Product 1─* ProductDocument *─1 MediaAsset
Product *─* Industry           Post *─1 AdminUser (author)   Enquiry 1─* EnquiryNote
```

## 4. Authentication design

Admin login flow (all in backend API routes — the browser never decides who is logged in):

1. `POST /api/auth/login {email, password}` → constant-time check (dummy hash when user missing); always the same generic error **"Invalid email or password."** On success → `{ ok: true, next: "mfa", methods: [...] }` and sets a short-lived (5 min) signed `mfa_pending` httpOnly cookie. Never returns the OTP or reveals user existence.
2. `POST /api/auth/verify-otp` or `/verify-totp` (or recovery code) → 6-digit code, hash compare, max 5 attempts, 5 min expiry, single use; TOTP replay blocked by storing last used time-step.
3. Success → access token (JWT, 10 min, HS256 with ≥64-byte secret; claims `sub, role, tv, sid, jti, iss, aud`) and refresh token (opaque 256-bit random, stored as HMAC hash, 7 days, rotating). Cookies: `HttpOnly; Secure; SameSite=Strict`; access cookie `Path=/`, refresh cookie `Path=/api/auth`. `__Host-` prefix in production.
4. `POST /api/auth/refresh` → rotates refresh token every call; reuse of an old token = revoke whole family (theft detection) + email alert.
5. `POST /api/auth/logout` → revoke session in DB, clear cookies. `logout-all` revokes all sessions and bumps tokenVersion.
6. Password reset → token single-use, 15 min, hashed; after reset: `tokenVersion++`, revoke all sessions.
7. Email change → current password + OTP to the old email + confirmation link to the new email.
8. MFA enable/disable → OTP sent to the **default super-admin email** first; the toggle applies only after that code. Logged in AuditLog and alerted by email.

Verification rule: every protected handler calls `requireAdmin({ role })` which verifies JWT signature, pinned alg, iss, aud, exp, then loads the user and checks `tokenVersion`, status and session not revoked. `proxy.js` only does redirects; it is never the only check (CVE-2025-29927 lesson).

Never: decode without verify · tokens in localStorage/sessionStorage · non-rotating refresh tokens · reusable reset links · OTP in API response · different errors for unknown email vs wrong password.

## 5. Admin seed

`prisma/seed.js` creates one SUPER_ADMIN from env `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` (forced change on first login, MFA setup mandatory), default themes, all 22 categories, products, default pages + sections with real copy, menus and business info. Idempotent (upsert). Refuses to run when `NODE_ENV=production` unless `ALLOW_PROD_SEED=true`.

## 6. Media pipeline (Cloudinary)

- Three input methods everywhere: local file picker, drag & drop, paste URL.
- Limits (editable in admin, hard caps in code): images JPG/PNG/WEBP/AVIF ≤ 5 MB; SVG blocked (or sanitised server-side); PDF ≤ 10 MB; max 20 files per batch.
- Local/drag-drop: browser requests a signed upload signature from `/api/admin/media/sign` (role, size, type checked) → uploads directly to Cloudinary `global-india/{env}/` → confirm route verifies with Cloudinary API and saves MediaAsset.
- URL upload: server fetch via `safeFetch()` (https only, DNS resolve, block private/loopback/link-local/metadata IPs, size cap, timeout, no redirect into private ranges) → Cloudinary.
- Delivery: `f_auto,q_auto`, responsive widths via next/image custom loader; alt text required.

## 7. Email (Brevo)

Templates: admin login OTP, MFA-toggle OTP, email-change OTP, password reset, new-login alert, security-change alert, refresh-reuse alert, enquiry to admin, enquiry acknowledgement, newsletter double opt-in. API key server-only. In development without a key the mailer logs a redacted notice (never the code) and writes the email to `.dev-mail/` (git-ignored) so local testing works.

## 8. Theme engine

Active Theme tokens are read server-side and printed as CSS variables on `<html>`. Tailwind v4 `@theme inline` maps utilities to those variables (`bg-primary` → `var(--color-primary)`). Admin can create / duplicate / activate themes, preview before publishing, and switch light/dark. Fonts are chosen from a whitelist, all loaded with `next/font` (self-hosted) and selected via CSS variables.

## 9. Caching & revalidation

Public data via `unstable_cache` tags: `settings`, `theme`, `menu`, `page:{slug}`, `product:{slug}`, `category:{slug}`. Every admin save calls `revalidateTag()`. Admin and auth API routes: `Cache-Control: private, no-store`.

## 10. Environment variables

Server-only unless `NEXT_PUBLIC_`:
`DATABASE_URL, DIRECT_URL, JWT_ACCESS_SECRET, JWT_ISSUER, JWT_AUDIENCE, REFRESH_PEPPER, OTP_PEPPER, TOTP_ENC_KEY, MFA_PENDING_SECRET, IP_HASH_SALT, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_WEBHOOK_SECRET, BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, BREVO_WEBHOOK_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, TURNSTILE_SECRET, NEXT_PUBLIC_TURNSTILE_SITE_KEY, NEXT_PUBLIC_SITE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, ALLOW_PROD_SEED`.
`.env*` git-ignored; `.env.example` holds names only.

## 11. Security headers

CSP with per-request nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https://res.cloudinary.com data: blob:`), HSTS 2 years + preload, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Cross-Origin-Opener-Policy: same-origin`, `poweredByHeader: false`, `productionBrowserSourceMaps: false`.

## 12. Deployment

GitHub → Vercel (preview + production). Neon branch per preview. `prisma migrate deploy` in build. Cloudflare proxied DNS in front of Vercel with WAF managed rules, rate rules, Super Bot Fight Mode, Turnstile on forms. Daily Neon backups + monthly restore test.

## 13. Admin control matrix

| Area | Admin screen | Who | What can change |
|---|---|---|---|
| Top bar | Settings > Top bar | Editor+ | Phone, email, GST, hours, show/hide each |
| Header | Settings > Header | Editor+ | Logo light/dark, menu, CTA, sticky on/off |
| Mega menu | Menus | Editor+ | Families, categories, featured product, order |
| Footer | Settings > Footer | Editor+ | About text, link columns, legal links, bottom bar |
| Home page | Pages > Home | Editor+ | Add/remove/reorder/hide sections; every text, image, button |
| Other pages | Pages | Editor+ | Sections, copy, images, SEO, status |
| Products | Products | Editor+ | All fields, specs, FAQs, documents, images, price toggle |
| Categories | Categories | Editor+ | Name, family, intro, image, order, SEO |
| Industries, insights | Industries / Insights | Editor+ | Full content, covers, related products |
| Media | Media | Editor+ | Upload by file / drag-drop / URL; alt; replace; delete |
| Business details | Settings > Business | Super admin | Name, address, GST, phones, emails, banker, map |
| Theme | Theme | Super admin publishes | Colours, fonts, radius, light/dark, saved themes, preview |
| Enquiries | Enquiries | Editor+ (Viewer read) | Status, assignee, notes, export |
| Users & MFA | Users / Security | Super admin + OTP | Invite, roles, disable, MFA on/off (OTP to default email) |
| SEO & redirects | SEO / Redirects | Editor+ | Titles, descriptions, OG images, 301 rules, verification tags |
| Limits | Settings > Uploads, Security | Super admin | Upload sizes/types, rate limits (within hard caps) |
