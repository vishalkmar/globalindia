# Memory.md — Global India Website

> Single source of truth. Read this before any work. Update the **Progress log** at the end of every phase.

## 1. Project in one paragraph

A new, fully admin-controlled B2B website for **Global INDIA**, a Delhi-based supplier of chemical raw materials (since 2002). Layout, page flow and section behaviour follow the reference site **aveeroilsandfats.com** (long-form B2B oleochemical site). Real business content comes from the owner's old site **globalindiachem.com**. The visual theme is our own (not Aveer's colours). The product catalogue (categories, mega menu, product pages) is ours — Aveer has no catalogue. Every piece of text, image, menu, colour and font must be editable from the admin panel.

## 2. Business facts (source: globalindiachem.com, re-checked 21 Nov 2026)

| Field | Value |
|---|---|
| Company | Global INDIA (write "Global India" in body copy) |
| Established | 2002 (24+ years in 2026) |
| Proprietor | Mr. Akash Rathod |
| Nature of business | Manufacturer, Supplier and Trader of chemical raw materials |
| Team size | 35 people |
| Banker | Kotak Mahindra Bank |
| GST | 07BMMPA5592C1Z4 |
| Address | 419, Khasra No-300, Ground Floor, Burari Road, Delhi - 110084, India |
| Phone | +91 80717 79152 |
| Email | Not published on old site — owner must add in Admin > Business Info before launch |
| Market | All India; export enquiries accepted (FOB) |
| Trade terms | MOQ 50 kg / 50 L, 25 kg & 50 kg bags, 200 L drums, ~7 day dispatch, samples on request |
| Social links | None yet — fields exist in admin, hidden when empty |
| Old-site title line | "Quality Manufacturer and Supplier from Delhi for Light Liquid Paraffin and Food Grade Xanthan Gum" |

**Industries served:** Food & beverage, Cosmetics & personal care, Pharmaceuticals, Detergents & home care, Soap making, Textiles & industrial, Automotive care, Laboratories.

**Product categories (22, seed all):** Chemical Powder (15), Chemical Liquid (12), Industrial Chemical (10), Alcohol Solvents (6), Detergent Raw Material (11), Light Liquid Paraffin (6), Cosmetic Raw Material (7), Paraffin Oil (9), Paraffin Wax (1), Refined Glycerine (5), Food Additive (5), Surfactants & Cleansing Agents (2), Hand Wash (4), Liquid Detergent (4), Tyre Polish (2), Automotive Cleaners (2), Silicone Oil (3), Car Dashboard Polish (1), Soda Ash (1), Toilet Cleaner (2), White Phenyl (2), Laboratory Chemicals (12). Total ≈ 120 products.

**Public grouping (6 families for menus):**
1. Food Ingredients & Additives
2. Personal Care & Cosmetic Bases
3. Detergent & Surfactant Raw Materials
4. Paraffins, Oils & Glycols
5. Industrial & Laboratory Chemicals
6. Finished Home & Auto Care

**Hero products (featured on home):** Light Liquid Paraffin, Food Grade Xanthan Gum, DL Malic Acid, Propylene Glycol 99%, SLES 70%, Refined Glycerine 99.5%.

## 3. Content rules (very important)

1. Copy must read like a real trading person wrote it: short sentences, concrete numbers (MOQ, pack size, CAS, grade). Banned hype words: prodigious, laureate, cutting-edge, revolutionary, seamless, unlock, elevate, delve, unparalleled, world-class, synergy, leverage.
2. Fix old-site errors: "Mystric" → Myristic Acid, "Gultamate" → Glutamate, "Hidrogen" → Hydrogen, "Comapny" → Company, "Silicon Oil" → Silicone Oil.
3. Third-party brands (Godrej, Tata, Cargill, Daffodil, Jayraj, Wilfarin, Fufeng, KLK, Wacker) are sourced/distributed — never claim we manufacture them. Use "Authorised stock of…" / "We supply…".
4. Prices: never hard-coded on public pages. Show "Request today's price". Admin can toggle "show indicative price" per product.
5. Every product page answers: what it is, grade/purity, CAS, pack sizes, MOQ, applications, storage, documents (COA, MSDS/SDS, TDS), dispatch time.
6. No emojis anywhere. Icons are SVG only (lucide-react). Enforced by lint rule.
7. Reference-site mistakes we must NOT copy: wrong breadcrumbs, 404 "Services" link, login-gated contact form, stale copyright year, "0+" counters with no server value, inconsistent numbers between pages.

## 4. Tech stack (locked)

| Area | Choice | Note |
|---|---|---|
| Framework | **Next.js 16 (App Router)** with **Turbopack** | User asked for "Vite-fast". Next.js does not run on Vite; Turbopack is Next's own Rust bundler and is the default dev/build bundler in v16. PDF said v15 — v16 chosen because it is the current patched line (security phases need patched versions). In v16 `middleware.js` is named `proxy.js`. |
| Language | JavaScript only (.js/.jsx, JSDoc for types) | No TypeScript files anywhere |
| Styling | Tailwind CSS v4 (`@theme` + CSS variables) | |
| Database | PostgreSQL on **Neon** | pooled `DATABASE_URL` + direct `DIRECT_URL` |
| ORM | Prisma 6.19 (`prisma-client-js`) | Prisma 7 generates TS source; v6 keeps the project pure JS |
| Email | **Brevo** transactional API | server-only |
| Media | **Cloudinary** (images + PDFs) | signed uploads |
| Icons | lucide-react (SVG) | |
| Validation | Zod v4 | |
| JWT | jose (HS256 pinned, iss/aud/exp) | |
| Password hash | argon2 (argon2id) | |
| TOTP | own RFC 6238 implementation in `lib/auth/totp.js` (tested with RFC vectors) | fewer dependencies (supply-chain lesson); replaces otplib |
| Rate limit | Upstash Redis (in-memory fallback in dev) | |
| SEO | Metadata API + `sitemap.js` + `robots.js` + JSON-LD helpers (next-seo style) | |
| Tests | Vitest (unit) + Playwright (E2E) | |
| Hosting | Vercel behind Cloudflare (WAF, bot management, Turnstile) | |

## 5. Working rules for Claude (must follow)

1. Before starting any phase: print the full todo list of that phase from Phase.md and ask **"Phase N start karun?"**. Start only after a clear yes. (Exceptions from the owner: 21 Nov 2026 — phases 1–5 back-to-back; 22 Nov 2026 — from Phase 10 onwards continue phase after phase without asking until told to stop. Still list todos, tick them, test and commit each phase.)
2. Tick each todo in Phase.md (`- [x]`) and show the ticked list on screen so progress per phase is visible.
3. Never skip todos to go faster. Never shorten a page because of time. Build long, multi-section pages properly.
4. After each phase: run lint + build + relevant tests, update the Progress log below, then stop and ask before the next phase.
5. Every new component must have an admin-editable data source (no hard-coded copy in JSX except fallback defaults).
6. Read Design.md before UI work, Architecture.md before backend work, Content.md before copy/seed data, Security.md before phases 17–30.
7. If a todo needs something only the owner can provide (account, API key, domain), do all code-side work, mark it `[~]` (blocked on owner) and list it under Open questions.

## 6. Progress log

| Phase | Status | Date | Notes |
|---|---|---|---|
| 0 Documentation | Done | 2026-11-21 | docs/ created from PDF + reference sites re-checked |
| 1 Project setup | Done (15/20, 5 blocked on owner accounts) | 2026-11-21 | Next 16.4 + Turbopack, JS only, ESLint no-emoji rule, Prettier, env template, secrets generator, PGlite local DB. Neon/Cloudinary/Brevo/Upstash/Vercel accounts pending (docs/setup/ACCOUNTS.md) |
| 2 Design system | Done | 2026-11-21 | 3 AA-checked presets (light+dark), Tailwind default palette removed, 9 whitelisted fonts, base UI kit, /styleguide (dev only) |
| 3 Database | Done | 2026-11-21 | 28 models, migrations verified on fresh DB, idempotent seed with prod guard |
| 4 JWT auth core | Done | 2026-11-21 | jose HS256 pinned, rotating refresh + family reuse detection, lockout, guard, proxy.js (UX only) |
| 5 MFA + seed | Done | 2026-11-21 | Email OTP, TOTP (own RFC 6238 impl), recovery codes, MFA changes approved from default admin email, email change 3-step, reset, setup wizard, security page; 55 unit tests + Playwright E2E passing |
| 6 Admin shell | Done | 2026-11-21 | Shell (sidebar, breadcrumb, user menu, mobile drawer), role matrix (docs/Roles.md), requirePermission, dashboard, DataTable, Zod FormBuilder, SaveBar + Ctrl+S, unsaved guard, dnd-kit reorder, Tiptap + server sanitiser, preview (draft mode + admin check), revisions, users (invite/role/disable), audit viewer, 403/404/error. 108 unit + 4 E2E passing |
| 7 Media library | Done (18/20, 2 need Cloudinary keys) | 2026-11-21 | Signed direct uploads, byte-level checks (magic bytes, SVG/markup refusal, dimension caps, PDF active-content scan incl. compressed streams), SSRF-safe URL upload, library grid + detail (alt, folder, focal point, replace, usage, delete guard), MediaPicker, product documents API, Cloudinary loader. Local dev driver until keys arrive. 171 unit + 5 E2E passing |
| 8 Settings + themes | Done | 2026-11-21 | 9 settings sections (strict Zod, revisions, cache tags), menu builder (5 locations, 2 levels), theme manager (3 presets, duplicate, editor with contrast report, fonts, radius, density, button style, light/dark, live preview), root layout reads active theme + SEO from DB, analytics after consent, maintenance gate. 205 unit + 6 E2E passing |
| 9 Public layout | Done (18/20, 2 wait for catalogue/pages) | 2026-11-22 | Top bar, sticky shrinking header, dropdowns + products mega menu (keyboard/mouse/Esc), mobile drawer, Ctrl+K search (lazy-loaded) + search API, breadcrumb with JSON-LD, 4-column footer, floating Call/WhatsApp, consent banner (analytics only after consent), skip link, 404/error/global-error. Lighthouse mobile 95-98/100/96/100. 211 unit + 15 E2E passing |
| 10 Home page | Done | 2026-11-22 | Section registry (14 types, strict schemas, real Content.md copy), home rendered from Page/Section rows, draft / preview (draft mode + admin session) / publish / discard / history, page editor (reorder, hide, duplicate, add, per-section forms, SEO), data sections hide when empty, FAQ JSON-LD, single RevealObserver. 237 unit + 19 E2E passing |
| 11 Company pages | Done | 2026-11-22 | 14 company section types (registry-company.js, rich text sanitised on save), generic `[page]` route for admin pages (about, why-us, quality, gallery live; careers seeded as draft), real copy in prisma/seed-pages.js, Admin > Gallery manager (add/caption/category/reorder/hide, revisions, audit), real 404 for unknown/draft slugs, cookie consent read client-side so public pages are fully static, scroll reveal moved to a CSS view timeline (RevealObserver removed: no hydration mismatch, less JS), (site)/not-found.js so a 404 inside the site layout does not repeat the header. 254 unit + 23 E2E passing |
| 12 Catalogue | Done | 2026-11-22 | 22 categories / 87 products seeded (prisma/seed-catalogue.js, guides in seed-guides.js, CAS check digits verified), admin categories (family groups, drag reorder, editor, delete guard) and products (filters, full editor with specs/FAQs/gallery/documents/price/brand, duplicate, soft delete, CSV export/import with dry run), publish permission enforced, redirects on slug change and delete, /products hub (family links + instant filter) and /products/[category] pages. 305 unit + 27 E2E |
| 13 Product page | Done | 2026-11-22 | /products/[category]/[product] buyer's guide: hero with SEO H2, CTAs (prefilled quote link), fact strip, sticky anchor bar (scroll-based active section), what is it / sourcing / applications by industry / indicative specs / ask the supplier / packaging & storage / documents / supply & price / FAQs / related / CTA, Product JSON-LD with Offer and no price. Product.content edited in Admin (Buyer's guide section); empty fields filled by lib/catalogue/guide.js from product data; full hero content for 6 products (prisma/seed-hero-content.js). Wrong category in URL redirects. Tables stack into cards on phones. 312 unit + 31 E2E |
| 14 Enquiries | Done | 2026-11-22 | /contact with four forms (3-step quote, sample, callback, message) in hash-linked tabs, prefill from ?product/?doc and the "Add to quote" basket (httpOnly cookie of slugs via /api/public/basket), click-to-load map, thank-you page with reference GI-XXXXXX. POST /api/public/enquiry: strict Zod, same-origin, Turnstile (fails closed in production without keys), honeypot, time-to-submit, rate limit per IP and per email, spam score + block list (setting "enquiries"), products snapshot, hashed IP, Brevo emails to team + customer after the response. Admin inbox (filters incl. dates, export of current view), detail with status/assign/notes/timeline, header bell. |
| 15 Content | Done | 2026-11-22 | /industries (8, linked both ways with products), /insights (topics, pagination /insights/page/n, articles with TOC + Article JSON-LD, scheduling via publishedAt in the future, cache life 1 h), /faq (topics, FAQPage JSON-LD), /legal/{privacy,terms,cookies,shipping,disclaimer} as managed pages "legal-*", /downloads (new "downloads" section), newsletter double opt-in (footer, 7-day single-use link, Brevo list on confirm). Admin: industries and articles editors, FAQ / testimonials / client logos list editors (sortable repeater). Testimonials and logos intentionally empty. 393 unit + 9 new E2E |
| 16 Admin polish | Done | 2026-11-22 | Dashboard charts (enquiries per week, top products) + images-without-alt count; global admin search (Ctrl+K, permission-filtered); redirect manager (301/302, no loops/chains) applied site-wide by the proxy from an in-memory map (60 s refresh); email preview + test send; upload type switches; trash with restore (30 days) + daily purge cron; cache purge button; /api/health; axe audits (0 serious); JS budget 164-167 KB gzip per route; backups/restore doc. 428 unit + E2E |
| 17 Security: injection | Done | 2026-11-22 | Audit (Prisma only, no string SQL), LIKE wildcard escaping (likeTerm) in admin lists and both searches, cuid id checks, allow-listed sort keys, CR/LF stripped in logs and email headers, CSV formula guard, prototype-pollution + body-size guard in readJson, ReDoS review. Neon: least-privilege role gi_app (rows only; no DDL, no roles, no _prisma_migrations) verified; owner kept for migrations. docs/security/17.md, injection.test.js |
| 18 Security: CSRF | Done | 2026-11-22 | Synchronizer token: HMAC(session id) when signed in, HMAC(httpOnly SameSite=Strict pre-session nonce) before login; GET /api/auth/csrf; X-CSRF-Token checked in route() for all unsafe /api/admin + /api/auth calls (refresh exempt); rotates on login; adminFetch/postJson/upload XHR send it and retry once on code "csrf". Server Actions allowedOrigins, frame-ancestors none. docs/security/18.md, csrf.test.js |
| 19 Security: validation + uploads | Done | 2026-11-22 | Strict Zod everywhere, length/format/range limits, server re-validation, sanitize-html allow-list, magic bytes, PDF active-content scan, SVG refused, random names, size caps, upload rate limit, generic errors; seeded fuzz test on 11 endpoints. docs/security/19.md |
| 20 Security: XSS + CORS | Done (2 partial) | 2026-11-22 | Static CSP from src/lib/security/csp.js in next.config (no nonce: PPR), experimental SRI sha256, Trusted Types report-only, /api/csp-report; foreign-origin preflights 403 in proxy, no ACAO anywhere, CORP/COOP same-origin. xss.test.js + cors.spec.mjs. docs/security/20.md |
| 21 Security: authorization | Done | 2026-11-22 | Audit: every admin handler and page guarded (signed-out 401 test over all routes; revisions now check auth before input). Setting "Editors and viewers see only enquiries assigned to them" (super admin, off by default) enforced via enquiryScope() in list/export/bell/dashboard/search/detail/update/notes. denyAccess() = single refusal path: audit row "authz.denied" + burst alert (10 in 15 min -> email to super admins). Strict bodies stop mass assignment; own-role change refused. authz.test.js (role matrix, IDOR, escalation, mass assignment, drafts). docs/security/21.md |
| 22 Security: rate limits | Done (12 waits for Cloudflare) | 2026-11-22 | Limits per spec (login 5/15 min per IP+email, forms 5/h, search 60/min, uploads 30/h, every /api 300/min in the proxy, 8 emails/h per recipient), exponential lockout 15->30->60 min..24 h, Settings "Rate limits and blocked IPs" (caps, IPv4/IPv6 CIDR block list, refuses blocking yourself). Global API + mail caps fail open, auth limits fail closed. scripts/load-limits.mjs passed on a prod build. abuse.test.js. docs/security/22.md |
| 23 Security: tokens and sessions | Done | 2026-11-22 | Audit of JWT (HS256 pinned, iss/aud/exp/nbf, kid ring), 10 min access / 7 day rotating refresh with reuse detection, tokenVersion bumps, reset/email-change/OTP rules. New: key secrets must be >= 64 bytes (86 chars) and no two may share a value (env.js). Rotation procedure in docs/security/23.md. secrets.test.js, token-hygiene.test.js (kid rotation, full email-change flow) |
| 24 Security: secrets and logs | Done (10 at deploy) | 2026-11-22 | scripts/scan-secrets.mjs (--staged hook via .githooks, --history clean, --bundle clean) + gitleaks CI workflow; /.env, /.git, *.map 404 in the proxy; server-only on every secret module (test); removeConsole in prod (logger kept); retention cron: security records 30 days, audit log 365 days. Secret inventory with owners in docs/security/24.md |
| 25 Security: passwords and MFA | Done | 2026-11-22 | argon2id benchmark 157 ms (scripts/bench-argon.mjs); HIBP k-anonymity breach check on password change/reset (fails open); step-up (password within 10 min, session-bound httpOnly cookie) on users, others' MFA, theme publish, security settings, cache purge, permanent delete, new recovery codes, with StepUpDialog + adminFetch retry; recovery codes regenerate button; idle timeout 30 min (server refresh + IdleGuard; bell polls are background); tests mfa-hardening.test.js |
| 26 Security: webhooks and SSRF | Done | 2026-11-23 | /api/webhooks/brevo (bearer secret, Brevo IP ranges in prod, 5 min window; unsubscribe/bounce/spam -> subscriber UNSUBSCRIBED) and /api/webhooks/cloudinary (X-Cld-Signature sha1/sha256 over raw body + timestamp; console delete -> media to trash); WebhookEvent ids for idempotency (purged after 30 days); webhook rate limit; safeFetch timeout 5 s. Owner must add both webhook URLs in Brevo/Cloudinary. webhooks.test.js |
| 27 Security: dependencies, CDN, DoS | Done (Cloudflare/uptime steps wait for the owner) | 2026-11-23 | npm audit: runtime clean; Prisma CLI chain accepted (fix = Prisma 7, separate task), effect override; audit-gate + CI (npm ci, audit signatures, lint, tests, build, bundle scan) + Dependabot; dotenv removed; origin lock (ORIGIN_LOCK_SECRET header from Cloudflare, cron/health exempt); image widths snapped to a fixed list; load test 635 rps p95 128 ms on the laptop; Cloudflare, Under Attack and incident runbooks in docs/security/27.md |
| 28 Security: anti-scraping and CVEs | Done (Cloudflare/watermark/AI-crawler choice wait for owner) | 2026-11-23 | Public PDFs now link to /d/<id>: only public product documents or Downloads-section PDFs, no hotlinking, 30/10 min per IP, 302 to a Cloudinary download link expiring in 10 min. robots.js (disallow /admin, /api/, /d/; AI crawler block switch in Settings -> SEO, default off). CVE table + version test. anti-scraping.test.js |
| 29 Security: UI attack surface | Done | 2026-11-23 | Audit with evidence table (docs/security/29.md). New: ui-surface.test.js (open redirect cases for safeNext, tabnabbing scan, autocomplete, no admin links on public site, sandboxed previews) and ui-surface.spec.mjs (clickjacking frame, no secrets in HTML/RSC, error text, HSTS, mixed content, no code in URLs, no tokens in storage, back after logout, map click-to-load, same message when locked). Button adds rel for internal _blank links |

## 7. Technical notes (decisions made while building)

- Local dev DB: `npm run db:local` starts PGlite on :5433 plus an in-memory shadow DB on :5434 (`SHADOW_DATABASE_URL`). URLs need `&pgbouncer=true` (PGlite multiplexer). `.env.local` keeps pointing here.
- Live DB (22 Nov 2026): Neon project, database `globalindia` (ap-southeast-1), migrated + seeded. Credentials only in git-ignored `.env.neon` (owner `DATABASE_URL`/`DIRECT_URL`, plus `APP_DATABASE_URL` for gi_app). Never paste them in chat or commit them; owner was advised to reset the owner password (it was shared in chat) and put the new one straight into `.env.neon`/Vercel.
- This PC's Windows DNS times out for `*.neon.tech`, so local commands reach Neon through a helper that resolves the host via 1.1.1.1 and connects by IP with `options=endpoint=<id>` (no system change). Not needed on Vercel.
- E2E start (tests/e2e/global-setup.mjs) switches maintenance off and resets the home page to the seed, so a run stopped half-way cannot break the next one.
- Newsletter confirmation: the email links to /newsletter/confirm#t=<token>; only the button (POST) confirms, so mail scanners cannot subscribe people (old GET links just redirect).
- Git hooks: `npm install` sets core.hooksPath=.githooks; the pre-commit hook runs the secret scanner on staged files.
- E2E after Phase 25: specs that publish a theme, toggle maintenance or invite users will meet the step-up password dialog; update them at the next full E2E run.
- E2E never touches Neon: playwright.config.mjs forces DATABASE_URL/DIRECT_URL to the local PGlite (or E2E_DATABASE_URL, which must be localhost) and refuses anything else.
- Super admin on Neon: admin@globalindia.local from the seed (change email/password + MFA on first login).
- Dev email: without `BREVO_API_KEY` mails are written to `.dev-mail/` (git-ignored). Tests capture mail in memory.
- `AdminUser.mfaSetupAt` marks first-login setup finished; `totpPendingAt` lets a pending authenticator secret be reused for 10 minutes (fixes a double-request race).
- Default approval inbox for MFA changes = `SiteSetting security.defaultAdminEmail` (seeded from `SEED_ADMIN_EMAIL`).
- Cache Components is on: anything reading cookies/searchParams sits inside `<Suspense>`.
- Admin routes live in `src/app/admin/(panel)/` (shell) and `(auth)/` (sign-in). Every page calls `requirePermissionPage`, every API `requirePermission` — the layout check is not relied on.
- Invites reuse PasswordResetToken (48 h) and the /admin/reset page; status INVITED -> ACTIVE on first password.
- npm audit: 4 "high" findings are inside the Prisma CLI's config loader (deepmerge-ts, effect), build-time only; fixed by Prisma 7 — decide in Phase 27.
- Media storage: Cloudinary when CLOUDINARY_* are set, otherwise a dev-only local driver (.dev-media, served by /api/dev-media, 404 in production). Images upload as resource_type image, PDFs as raw. Uploads: sign -> direct upload -> confirm (server re-checks the stored bytes and deletes anything invalid).
- Media delete is a soft delete; the stored file is purged by the 30-day trash job (Phase 16).
- Public data is read through src/lib/site-data.js ('use cache' + tags). Admin saves call invalidate(tag) = revalidateTag(tag, { expire: 0 }), so the next request is fresh. In dev, the first request after a save can show a "could not validate instant navigation" insight — expected, behaviour is correct.
- Settings keys and their permission resource live in src/lib/settings/schemas.js (SETTINGS). analytics/maintenance/uploads are SUPER_ADMIN only.
- Shared pure modules that the seed imports must use explicit ".js" relative imports (plain Node).
- Public pages render inside SiteShell ((site)/layout.js) which provides <main id="main">; pages output sections only. The root not-found also uses SiteShell.
- E2E runs its own dev server on port 3100 with E2E_RELAXED_LIMITS=1 (rate limits x20, ignored in production). Stop the 3000 dev server before `npm run e2e`.
- tests/e2e/site-layout.spec.mjs has a PLANNED list of pages linked from menus but built later; remove entries as pages ship.
- Managed pages: src/components/site/ManagedPage.jsx renders a slug's sections (live cached; preview = draft mode + admin). Add new section types in src/lib/sections/registry.js AND src/components/sections/SectionRenderer.jsx.
- E2E tests must change settings/pages through the admin API (helpers.mjs putSetting / page API), never directly in the DB — direct DB edits skip cache invalidation and leak into later tests.
- Performance follow-up for Phase 31: RSC payload ~112 KB on home; TBT ~0.9 s under Lighthouse mobile throttling.
- `[page]` route uses `ensureStatic = "navigation"` + `instant = false`: an unlisted slug waits for its full render so `notFound()` sends a real 404 (without it, Partial Prefetching streams the fallback shell with status 200 = soft 404). Consequence: nothing in the public layout may read cookies/headers at render time. Fixed routes (/products, /contact...) win over `[page]`.
- Cookie consent: the httpOnly cookie is read by GET /api/public/consent from the banner after load (no server cookie read in the layout, so home and company pages are fully static ○).
- Full-page screenshots need `.cv-auto{content-visibility:visible}` injected, otherwise below-the-fold sections come out blank (scripts/shots-phase11.mjs).
- Scroll reveal = CSS only (`[data-reveal]` + `animation-timeline: view()` in globals.css). Never add classes to server-rendered elements from client JS before hydration (causes hydration mismatch).
- Two 404 files: app/not-found.js (no route matched: wraps SiteShell) and app/(site)/not-found.js (notFound() inside the site layout: body only). Shared body = components/site/NotFoundContent.jsx.
- Gallery: GalleryItem rows saved as a whole list by PUT /api/admin/gallery (permission resource `media`); revisions under entity "gallery".
- Catalogue URLs: /products, /products/[category], /products/[category]/[product] (detail = Phase 13). Changed category/product slugs go into Redirect; lookups via findRedirect() (cached, tag "redirects"). Deleting a published product redirects its URL to the category. Next's permanentRedirect sends 308 (search engines treat it as 301).
- Catalogue writes go through src/lib/admin/products.js saveProduct() (API, duplicate and CSV import share it): publish permission, slug check, media check, gallery/documents, redirects, revision, cache tags, audit.
- Product CSV: columns in src/lib/admin/productCsv.js; cells starting with = + - @ get an apostrophe on export (formula injection) which import removes. Import is all-or-nothing after a dry run.
- Admin editors that navigate after save must wait until the unsaved-changes guard is released (goTo state + effect); router.replace while the form is dirty is swallowed by the history trap.
- Next 16 keeps the previous route mounted but hidden after client navigation; E2E selectors can match it (assert the visible H1 first).
- Product page text = Product.content (admin) field by field, else lib/catalogue/guide.js builds honest text from the product data (never invents specs or certificates). Change the template there, not in the page.
- `<Table stackOnMobile>` turns rows into labelled cards below 640 px (CSS only, same DOM).
- Anchor targets on the product page use scroll-mt-12; html already has scroll-padding-top (header + 16 px). Adding more margin pushes sections below the anchor bar's 160 px "active" line.
- Enquiries: submit pipeline in src/lib/enquiries/submit.js; spam rules in spam.js (60+ = SPAM, kept but never emailed; honeypot = fake success, nothing stored). Recipients = setting enquiries.notifyEmails, else security.defaultAdminEmail.
- Scripts never touch document.cookie (unit test enforces it): the quote basket and consent both go through small API routes that set httpOnly cookies. Use cookieValue(req, name) from lib/http.js in routes.
- Legal pages are managed pages with slug "legal-<name>", served only at /legal/<name>; lib/pagePath.js gives the public path for any page slug.
- Post scheduling: status PUBLISHED + publishedAt in the future = hidden until then. Post reads use tagWithLife("hours") instead of tag() so they refresh by themselves.
- Articles show "By the Global India sales desk"; admin names are never sent to the public site.
- Testimonials and client logos must be real: never seed or invent them.
- Redirects: Redirect table, applied in src/proxy.js via lib/redirectMap.js (per-instance cache, 60 s). Admin saves reset the cache on that instance. Slug changes add rows automatically.
- Trash: soft-deleted rows keep a retired slug "<slug>--deleted-xxxxxxxx"; restore strips it (or adds -restored). /api/cron/purge (CRON_SECRET, vercel.json daily) removes items after 30 days.
- JS budget: npm run budget (needs next start on :3000). Shared baseline is ~164 KB gzip; keep heavy client code (zod, forms, editors) in chunks loaded after hydration or on interaction.
- Never write files from Python heredocs with "" or "
" inside strings: they turn into control characters. Use the Write/Edit tools.
- Public pages must show drafts only when `isPreview()` (draft cookie AND admin session) — use it from Phase 9/10.

## 8. Open questions / needs from owner

- Official email address(es) for the site and the Brevo sender domain.
- Real logo files (SVG preferred) and factory/warehouse/drum photos.
- Which products are actually manufactured or blended in-house? Certifications (ISO, FSSAI, GMP)?
- Domain name and where DNS is managed (needed for Cloudflare WAF and Brevo DKIM).
- Confirm the middle timeline years on /about (2008, 2014, 2019 are placeholders from the product history) and the brand list on /quality.
- Legal pages (privacy, terms, cookies, shipping, disclaimer) are plain-English drafts: have them checked by a lawyer/CA before launch.
- Brochure PDF for /downloads; real testimonials and client logos (with permission); BREVO_LIST_ID for the newsletter list.
- Careers: is the company hiring? (page is a draft until switched on in Admin > Pages)
- Client logos allowed to be shown? Export countries served?
- Owner to decide: block AI crawlers (Settings -> SEO)? watermark product photos (needs final logo)?
- Planned upgrade: Prisma 6 -> 7 (clears the CLI-only audit findings listed in scripts/audit-gate.mjs).
- Neon: reset the neondb_owner password (shared in chat) and do the restore drill (Phase 16 todo 11).
- Accounts/keys: Brevo API key, Cloudinary keys, Upstash Redis, Cloudflare Turnstile keys, Vercel project.
