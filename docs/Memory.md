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

1. Before starting any phase: print the full todo list of that phase from Phase.md and ask **"Phase N start karun?"**. Start only after a clear yes. (Exception given by owner on 21 Nov 2026: phases 1–5 run back-to-back without asking; from Phase 6 onwards ask every time.)
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
| 7 Media library | Not started | | Ask before starting |

## 7. Technical notes (decisions made while building)

- Local dev DB: `npm run db:local` starts PGlite on :5433 plus an in-memory shadow DB on :5434 (`SHADOW_DATABASE_URL`). URLs need `&pgbouncer=true` (PGlite multiplexer). Neon replaces this when the owner shares URLs.
- Dev email: without `BREVO_API_KEY` mails are written to `.dev-mail/` (git-ignored). Tests capture mail in memory.
- `AdminUser.mfaSetupAt` marks first-login setup finished; `totpPendingAt` lets a pending authenticator secret be reused for 10 minutes (fixes a double-request race).
- Default approval inbox for MFA changes = `SiteSetting security.defaultAdminEmail` (seeded from `SEED_ADMIN_EMAIL`).
- Cache Components is on: anything reading cookies/searchParams sits inside `<Suspense>`.
- Admin routes live in `src/app/admin/(panel)/` (shell) and `(auth)/` (sign-in). Every page calls `requirePermissionPage`, every API `requirePermission` — the layout check is not relied on.
- Invites reuse PasswordResetToken (48 h) and the /admin/reset page; status INVITED -> ACTIVE on first password.
- npm audit: 4 "high" findings are inside the Prisma CLI's config loader (deepmerge-ts, effect), build-time only; fixed by Prisma 7 — decide in Phase 27.
- Public pages must show drafts only when `isPreview()` (draft cookie AND admin session) — use it from Phase 9/10.

## 8. Open questions / needs from owner

- Official email address(es) for the site and the Brevo sender domain.
- Real logo files (SVG preferred) and factory/warehouse/drum photos.
- Which products are actually manufactured or blended in-house? Certifications (ISO, FSSAI, GMP)?
- Domain name and where DNS is managed (needed for Cloudflare WAF and Brevo DKIM).
- Client logos allowed to be shown? Export countries served?
- Accounts/keys: Neon `DATABASE_URL`/`DIRECT_URL`, Brevo API key, Cloudinary keys, Upstash Redis, Cloudflare Turnstile keys, Vercel project.
