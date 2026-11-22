# Phase.md — Global India Website

**Rule:** Before each phase, list all 20 todos on screen and ask **"Phase N start karun?"**. Tick each todo (`[x]`) as it is done. `[~]` = code side done, blocked on something only the owner can provide (account/key/domain). After the last todo: lint, build, tests, update Memory.md, then ask before the next phase.

Phases 1–16 build the site and admin · 17–29 security · 30 security testing · 31 SEO · 32 launch.

## Roadmap

| # | Name | Outcome |
|---|---|---|
| 1 | Project setup | Repo, tooling, env, accounts ready |
| 2 | Design system | Tokens, fonts, every base UI component on a styleguide page |
| 3 | Database | All Prisma models migrated |
| 4 | JWT auth core | Login, rotating refresh, logout, guards, lockout |
| 5 | MFA + seed | Email OTP, authenticator app, recovery codes, seeded super admin |
| 6 | Admin shell | Layout, roles, tables, forms, revisions, audit viewer |
| 7 | Media library | Cloudinary uploads by file, drag-drop and URL with limits |
| 8 | Settings + themes | Business info, header/footer/menus, theme manager, light/dark |
| 9 | Public layout | Top bar, sticky header, mega menu, footer, search, 404 |
| 10 | Home page | 15 editable sections with real copy |
| 11 | Company pages | About, Why Us, Quality, Gallery, Careers |
| 12 | Catalogue | 22 categories, ~120 products, admin CRUD, CSV import |
| 13 | Product template | Long buyer's-guide product pages |
| 14 | Enquiries | Quote, sample, callback, contact forms, Brevo, inbox |
| 15 | Content pages | Industries, insights, FAQ, legal, downloads, newsletter |
| 16 | Admin polish | Dashboard, redirects, trash, backups, accessibility, freeze |
| 17 | Injection | SQL, ORM, CSV, header, prototype, path injection closed |
| 18 | CSRF | Tokens, SameSite, origin checks, Server Action origins |
| 19 | Validation + uploads | Zod on every input, safe uploads |
| 20 | XSS + CORS | Nonce CSP, sanitising, deny-by-default CORS |
| 21 | Authorization | BOLA/BFLA closed, server-side permissions |
| 22 | Rate limiting | Login, OTP, forms, search, uploads |
| 23 | Tokens + OTP | JWT and OTP rules enforced |
| 24 | Secrets + logs | No secrets in client, no source maps, redacted logs |
| 25 | Passwords + MFA | argon2id, encrypted TOTP, step-up auth |
| 26 | Webhooks + SSRF | Signed webhooks, replay protection, safeFetch |
| 27 | Deps + edge | Patched deps, Cloudflare WAF, DDoS runbook |
| 28 | Bots + CVEs | Bot challenge, anti-scraping, historic CVE hardening |
| 29 | UI audit | Clickjacking, open redirect, storage, page-source review |
| 30 | Security testing | Automated attack suites, ZAP, Nuclei, final report |
| 31 | SEO | Metadata, JSON-LD, sitemap, robots, redirects, Web Vitals |
| 32 | Launch | Go-live, handover, training, sign-off |

---

## Phase 1 — Project Setup & Tooling
- [x] 01 Create Next.js 16 App Router project (Turbopack) with JavaScript (no TypeScript)
- [x] 02 Set up src/ folder structure exactly as Architecture.md
- [x] 03 Install Tailwind CSS v4 and base globals.css
- [x] 04 Add ESLint (next/core-web-vitals) + Prettier + import sort
- [x] 05 Add lint rule to block emoji characters in JSX/strings
- [x] 06 Add jsconfig.json path aliases (@/components, @/lib)
- [x] 07 Install lucide-react, zod, clsx, tailwind-merge
- [x] 08 Create .env.example with all variable names, no values
- [x] 09 Add .gitignore for .env*, .next, coverage, source maps
- [x] 10 Initialise Git repo, main + develop branches
- [x] 11 Set poweredByHeader:false, productionBrowserSourceMaps:false
- [x] 12 Add server-only package and usage rule
- [~] 13 Create Neon project, main + dev branches, copy pooled URL
- [~] 14 Create Cloudinary account folders global-india/dev|prod
- [~] 15 Create Brevo account, sender, API key (server env only)
- [~] 16 Create Upstash Redis database for rate limiting
- [~] 17 Configure Vercel project with preview + production envs
- [x] 18 Add npm scripts: dev, build, lint, test, e2e, db:migrate, db:seed
- [x] 19 Copy docs folder into repo, link from README
- [x] 20 Verify: npm run build passes on clean clone

## Phase 2 — Design System & Theme Tokens
- [x] 01 Define CSS variables for all colour tokens from Design.md
- [x] 02 Map tokens in Tailwind @theme (primary, accent, surface, ink, muted, line)
- [x] 03 Load Fraunces, Manrope, JetBrains Mono via next/font
- [x] 04 Build type scale utilities (display, h2, h3, eyebrow, body, small, data)
- [x] 05 Container, section, grid helpers
- [x] 06 Button component (primary, secondary, ghost, link; sizes; loading)
- [x] 07 Input, Textarea, Select, Checkbox, Radio, FileDrop base styles
- [x] 08 Card, Badge, Tag, Divider components
- [x] 09 Eyebrow with accent line component
- [x] 10 Dialog/Modal and Drawer (focus trap, Esc close)
- [x] 11 Tabs and Accordion (keyboard accessible)
- [x] 12 Table component for specs (zebra with surface colour)
- [x] 13 Icon wrapper (44 px bordered square, lucide 1.5 stroke)
- [x] 14 Toast/notification component
- [x] 15 Skeleton loaders
- [x] 16 Reveal-on-scroll hook respecting reduced motion
- [x] 17 Count-up hook with server value fallback
- [x] 18 Focus ring style using accent colour
- [x] 19 /styleguide dev-only page showing every component
- [x] 20 Check contrast AA for all token pairs

## Phase 3 — Database Schema (Prisma + Neon)
- [x] 01 Install Prisma, configure DATABASE_URL + DIRECT_URL
- [x] 02 Model AdminUser with roles and MFA fields
- [x] 03 Model Session (refresh token family, rotation fields)
- [x] 04 Model OtpCode and PasswordResetToken (hashed, expiry, used)
- [x] 05 Model SiteSetting (key/value JSON)
- [x] 06 Model Theme (tokens JSON, active flag)
- [x] 07 Model Page and Section (typed sections, order, visibility)
- [x] 08 Model MenuItem tree (header, footer, mega menu)
- [x] 09 Model ProductCategory with family enum
- [x] 10 Model Product with specs, faqs, documents, SEO
- [x] 11 Model Industry, Post, Testimonial, ClientLogo, GalleryItem, Faq
- [x] 12 Model MediaAsset
- [x] 13 Model Enquiry with status pipeline
- [x] 14 Model AuditLog and WebhookEvent
- [x] 15 Add indexes (slug unique, status, categoryId, createdAt)
- [x] 16 Run first migration (local PGlite done; Neon dev branch runs `npm run db:deploy` once URL is set)
- [x] 17 Create Prisma client singleton lib/db.js (server-only)
- [x] 18 Write seed.js skeleton with upsert helpers
- [x] 19 Document ER diagram in Architecture.md
- [x] 20 Verify migration on a fresh database (fresh in-memory Postgres: all migrations applied, schema up to date)

## Phase 4 — JWT Auth Core
- [x] 01 lib/auth/password.js argon2id hash/verify
- [x] 02 lib/auth/jwt.js sign/verify with jose, alg whitelist, iss, aud, exp
- [x] 03 Access token 10 min with sub, role, tv, jti
- [x] 04 Opaque refresh token generator (32 random bytes) + hashing
- [x] 05 Session create/rotate/revoke helpers
- [x] 06 Refresh token family reuse detection (revoke family)
- [x] 07 Cookie helper: HttpOnly, Secure, SameSite=Strict, scoped paths
- [x] 08 POST /api/auth/login with generic error message
- [x] 09 POST /api/auth/refresh with rotation on every call
- [x] 10 POST /api/auth/logout revoke + clear cookies
- [x] 11 POST /api/auth/logout-all revoke all sessions
- [x] 12 requireAdmin(role) guard verifying token + DB tokenVersion
- [x] 13 Silent refresh in admin client (fetch wrapper retries once on 401)
- [x] 14 Proxy (middleware) redirect for /admin (UX only, not security)
- [x] 15 Account lockout after 5 failed logins (15 min)
- [x] 16 Constant-time responses to stop user enumeration
- [x] 17 Session list page data (device, last used)
- [x] 18 Unit tests for sign/verify/expired/tampered/alg-none tokens
- [x] 19 Unit tests for rotation and reuse detection
- [x] 20 Confirm no token ever touches localStorage

## Phase 5 — Admin MFA (Email OTP + Authenticator) & Seed
- [x] 01 OTP generator (6 digits, crypto random) stored hashed with pepper
- [x] 02 OTP expiry 5 min, max 5 attempts, single use
- [x] 03 Brevo template: login OTP (no OTP in API response ever) — dev outbox until BREVO_API_KEY is set
- [x] 04 POST /api/auth/verify-otp
- [x] 05 TOTP setup: secret encrypted (AES-256-GCM) at rest
- [x] 06 QR code page for authenticator app + manual key
- [x] 07 POST /api/auth/verify-totp with 1-step window
- [x] 08 Backup recovery codes (10, hashed, single use)
- [x] 09 MFA enable/disable requires OTP sent to default super-admin email
- [x] 10 Email change requires password + OTP to old email + link to new
- [x] 11 Password reset request (same response whether email exists or not)
- [x] 12 Reset token single use, 15 min, hashed; reset kills all sessions
- [x] 13 New-login alert email with device and time
- [x] 14 Forced password change + MFA setup on first login
- [x] 15 Seed SUPER_ADMIN from env, refuse prod seed without flag
- [x] 16 Admin login UI (email/password → method choice → code)
- [x] 17 Admin verify UI with resend timer (60 s cooldown)
- [x] 18 Admin security settings page (MFA, sessions, password)
- [x] 19 Audit log entries for every auth event
- [x] 20 E2E test full login with OTP and TOTP

## Phase 6 — Admin Panel Shell & Roles
- [x] 01 Admin layout: sidebar, top bar, breadcrumb, user menu
- [x] 02 Role matrix SUPER_ADMIN / EDITOR / VIEWER documented
- [x] 03 Permission helper can(user, action, resource) server side
- [x] 04 Dashboard page: enquiries today, products count, last edits
- [x] 05 Reusable DataTable (search, filter, sort, paginate server-side)
- [x] 06 Reusable FormBuilder driven by Zod schemas
- [x] 07 Sticky save bar with Save draft / Publish / Preview
- [x] 08 Unsaved-changes guard
- [x] 09 Drag-and-drop reorder helper (dnd-kit)
- [x] 10 Rich text editor (Tiptap) with sanitised HTML output
- [x] 11 Preview mode (draft cookie) for pages
- [x] 12 Revision history for pages and products (last 20)
- [x] 13 Users management (invite, role change, disable) — super admin only
- [x] 14 Audit log viewer with filters
- [x] 15 Toasts and error boundary for admin
- [x] 16 Admin 404 and 403 pages
- [x] 17 Admin noindex, nofollow + X-Robots-Tag
- [x] 18 Keyboard shortcuts (save Ctrl+S)
- [x] 19 Mobile-usable admin layout
- [x] 20 Test: VIEWER cannot reach any write endpoint

## Phase 7 — Media Library (Cloudinary)
- [x] 01 lib/cloudinary.js server-only config
- [x] 02 Signed upload signature route with role + type + size checks
- [x] 03 Upload method 1: local file picker
- [x] 04 Upload method 2: drag and drop (multi-file, progress bar)
- [x] 05 Upload method 3: paste image/PDF URL (server fetch via safeFetch)
- [x] 06 Size limits: images 5 MB, PDF 10 MB (admin-editable, hard cap in code)
- [x] 07 MIME + magic-byte check server side
- [x] 08 Block SVG upload or sanitise with DOMPurify server-side
- [x] 09 Save MediaAsset record with dimensions, bytes, uploader
- [x] 10 Media library grid with search, type filter, folders
- [x] 11 Alt text required before asset can be used
- [x] 12 MediaPicker component reused in every image field
- [~] 13 Image crop/focal point via Cloudinary gravity — focal point saved + CSS crop working; g_xy_center URL unit-tested, live check needs Cloudinary keys
- [x] 14 Replace asset keeps same id across pages
- [x] 15 Delete with "used in" check
- [x] 16 next/image Cloudinary loader with f_auto,q_auto
- [x] 17 PDF documents (COA, SDS, TDS) upload and attach to products
- [~] 18 Strip EXIF/GPS metadata on upload — signed incoming re-encode (c_limit) in place; live check needs Cloudinary keys
- [x] 19 Audit log for upload/delete
- [x] 20 Tests for oversize, wrong type, URL to private IP

## Phase 8 — Site Settings, Theme Manager & Business Info
- [x] 01 Business info editor (name, GST, address, phones, emails, hours)
- [x] 02 Top bar editor (show/hide items)
- [x] 03 Header editor (logo light/dark, CTA text + link, sticky on/off)
- [x] 04 Menu builder (header, mega menu, footer columns) with nesting
- [x] 05 Footer editor (about text, columns, bottom bar, auto year)
- [x] 06 Social links editor (hidden when empty)
- [x] 07 Theme list: create, duplicate, rename, delete, activate
- [x] 08 Theme editor: colour pickers per token with contrast warning
- [x] 09 Theme editor: font family pickers from whitelist
- [x] 10 Theme editor: radius, spacing density, button style
- [x] 11 Light / dark mode tokens and default mode setting
- [x] 12 Live theme preview before publish (scoped live preview of unsaved tokens next to the editor, light and dark)
- [x] 13 Preset themes: Pine & Brass (default), Navy & Copper, Graphite & Saffron
- [x] 14 Server injects active theme CSS variables in root layout
- [x] 15 Revalidate theme/settings tags on save
- [x] 16 Favicon and OG default image upload
- [x] 17 Global SEO defaults (title template, description)
- [x] 18 Analytics IDs field (loaded only after consent)
- [x] 19 Maintenance mode toggle
- [x] 20 Test theme switch updates whole site without redeploy

## Phase 9 — Public Layout: TopBar, Header, MegaMenu, Footer
- [x] 01 TopBar: phone (tel), email (mailto), GST, working hours
- [x] 02 Header: logo, nav, Request a quote button
- [x] 03 Sticky header after 120 px with border and shrink
- [~] 04 Mega menu: 6 families → categories, one featured product — families + quote card live; categories and the featured product fill in when the catalogue is seeded (Phase 12)
- [x] 05 Keyboard and screen-reader accessible menus
- [x] 06 Mobile drawer menu with accordion categories
- [x] 07 Search overlay (products, categories) — Ctrl+K
- [x] 08 Correct breadcrumb component with JSON-LD
- [x] 09 Footer column 1: logo + about text
- [~] 10 Footer column 2: quick links (no dead links) — link checker E2E in place; it lists the pages still to be built (Phases 11-15) and fails on any other broken link
- [x] 11 Footer column 3: product families
- [x] 12 Footer column 4: contact info + GST
- [x] 13 Footer bottom bar: auto year, legal links
- [x] 14 Floating call / WhatsApp button (SVG, admin toggle)
- [x] 15 Cookie consent banner (necessary only by default)
- [x] 16 Skip-to-content link
- [x] 17 404 page with search and popular categories
- [x] 18 Error page
- [x] 19 All data loaded from settings/menus (no hard-coded copy)
- [x] 20 Lighthouse check of layout on mobile — Performance 95-98, Accessibility 100, Best practices 96, SEO 100; LCP 0.8 s, CLS 0

## Phase 10 — Home Page (all sections editable)
- [x] 01 Section registry (type → component + admin schema)
- [x] 02 Hero: photo, eyebrow, H1, sub text, 2 buttons, 3 trust facts
- [x] 03 FeatureTriad: range, pack sizes, Delhi distribution
- [x] 04 About teaser with pull quote from proprietor
- [x] 05 Product families grid (6 cards with counts)
- [x] 06 Featured products (6 ProductCards) — section live; shows once products are marked featured (catalogue, Phase 12)
- [x] 07 Industries we serve (8 icon cards)
- [x] 08 Numbered values 01-04
- [x] 09 Stats strip (since 2002, products, team, cities served)
- [x] 10 How ordering works (4 steps)
- [x] 11 Client logo strip (optional) — section live; hidden until logos are added (manager in Phase 15)
- [x] 12 Testimonials (optional) — section live; hidden until testimonials are added (manager in Phase 15)
- [x] 13 Insights preview (3 latest posts) — section live; hidden until posts are published (Phase 15)
- [x] 14 Home FAQ (6 questions, FAQ schema)
- [x] 15 Final CTA band with quote button and phone
- [x] 16 Admin: add, remove, reorder, hide each section
- [x] 17 Admin: edit every text, image, button per section
- [x] 18 Write real human copy for all sections from Memory.md
- [x] 19 Responsive check 360 / 768 / 1280 / 1536
- [x] 20 Performance: LCP image priority, CLS 0 — LCP 1.1-1.2 s, CLS 0; Lighthouse mobile 77-80 / 100 / 96 / 100. TBT ~0.9 s on 4x CPU throttle is hydration of the long page; reduce in Phase 31

## Phase 11 — About, Why Us, Quality, Infrastructure
- [x] 01 About hero with correct breadcrumb
- [x] 02 Our story (2002 to today) copy
- [x] 03 Timeline component (editable milestones)
- [x] 04 Key facts table (nature, team 35, banker, GST)
- [x] 05 Vision and mission blocks
- [x] 06 Values list with bold lead-ins
- [x] 07 Proprietor message with photo
- [x] 08 Warehouse and logistics section
- [x] 09 Why Us page: 4 numbered pillars
- [x] 10 Why Us: benefits at a glance (4 cards)
- [x] 11 Quality & Documentation page (COA, SDS, TDS, batch traceability)
- [x] 12 Sourcing partners section (brand names as "we supply")
- [x] 13 Packaging options section (25 kg, 50 kg, 200 L, carboys)
- [x] 14 Gallery page (filterable) + Admin > Gallery manager
- [x] 15 Careers page (optional, admin toggle: publish/unpublish in Admin > Pages; seeded as a draft)
- [~] 16 Contact CTA form block on About (contactBlock section with address, phone and quote button; the full enquiry form arrives in Phase 14)
- [x] 17 All pages editable through Page + Section system
- [x] 18 Per-page SEO fields
- [x] 19 Human-tone copy review pass
- [x] 20 Visual QA vs reference site structure

## Phase 12 — Product Catalogue & Admin CRUD
- [x] 01 Seed 22 categories with families and intros
- [x] 02 Seed ~120 products with cleaned names (fix typos) — 87 after merging the old site's duplicate listings
- [x] 03 Admin categories list, create, edit, reorder
- [x] 04 Admin products list with filters (category, status, featured)
- [x] 05 Product form: basics (name, slug, category, CAS, grade, purity, form)
- [x] 06 Product form: pack sizes, MOQ, shelf life, dispatch time
- [x] 07 Product form: applications (tag list)
- [x] 08 Product form: specs table editor (property, value, method)
- [x] 09 Product form: FAQs editor
- [x] 10 Product form: documents (COA/SDS/TDS) picker
- [x] 11 Product form: brand note and "sourced" flag
- [x] 12 Product form: show indicative price toggle
- [x] 13 Product form: gallery images
- [x] 14 Bulk import/export CSV
- [x] 15 Duplicate product action
- [x] 16 Draft / published / archived status
- [x] 17 Products hub page with family tabs and search
- [x] 18 Category pages with product table and buying guide (guides + FAQs seeded for 6 key categories)
- [x] 19 Slug redirects when slug changes (301 table) — Redirect rows; served as permanent redirects (Next sends 308, treated as 301 by search engines)
- [x] 20 Test CRUD permissions per role

## Phase 13 — Product Detail Template (Buyer's Guide)
- [x] 01 Eyebrow + H1 + SEO H2 "[Product] Supplier in Delhi, India"
- [x] 02 Intro paragraph with key facts
- [x] 03 CTA buttons: Request quotation (prefilled), Call
- [x] 04 Fact strip: CAS, grade, purity, pack, MOQ, shelf life
- [x] 05 Sticky anchor nav
- [x] 06 What is it section
- [x] 07 How it is made / sourced section
- [x] 08 Applications by industry list
- [x] 09 Specifications table (marked indicative)
- [x] 10 Ask the supplier table (question / why it matters)
- [x] 11 Packaging and storage section
- [x] 12 Documents download block (gated by enquiry optional) — public PDFs download; private ones link to the enquiry form (form itself: Phase 14)
- [x] 13 Supply and pricing factors table
- [x] 14 FAQ accordion with FAQ schema
- [x] 15 Related products
- [x] 16 Closing CTA band
- [x] 17 Product JSON-LD (Product, Offer without fake price)
- [x] 18 Write full content for 6 hero products
- [x] 19 Template content for remaining products from data
- [x] 20 Mobile QA of long page

## Phase 14 — Enquiry, Quote & Contact System
- [x] 01 Contact page: address, phone, email tiles, map (click to load)
- [x] 02 Public contact form (no login required)
- [x] 03 Multi-step quote form (product, quantity, pack, location, contact)
- [x] 04 Sample request form
- [x] 05 Request callback form
- [x] 06 Zod validation client + server
- [x] 07 Cloudflare Turnstile on every public form (wired; needs TURNSTILE_SECRET + site key before launch, fails closed in production without them)
- [x] 08 Honeypot field + time-to-submit check
- [x] 09 Save Enquiry to DB with status NEW
- [x] 10 Brevo email to admin with enquiry details
- [x] 11 Brevo acknowledgement email to customer
- [x] 12 Admin enquiries inbox (filters, status, assign, notes)
- [x] 13 Enquiry detail with timeline
- [x] 14 Export enquiries CSV
- [x] 15 "Add to quote" basket across product pages (cookie, no PII)
- [x] 16 Success page with next steps
- [x] 17 Rate limit per IP and email
- [x] 18 Spam score and block list
- [x] 19 Notification bell in admin for new enquiries
- [x] 20 E2E test of each form

## Phase 15 — Industries, Insights, FAQ, Legal
- [x] 01 Industries list page
- [x] 02 Industry detail template (needs, products, FAQs)
- [x] 03 Write 8 industry pages (food, cosmetics, pharma, detergents, soap, textile, auto care, labs)
- [x] 04 Insights (blog) list with categories and pagination
- [x] 05 Post editor (Tiptap, cover image, author, SEO)
- [x] 06 Post detail with table of contents
- [x] 07 Write 3 starter posts (human tone)
- [x] 08 Global FAQ page grouped by topic
- [x] 09 Privacy policy page
- [x] 10 Terms of use page
- [x] 11 Cookie policy page
- [x] 12 Shipping & returns / dispatch policy page
- [x] 13 Disclaimer on indicative specs
- [x] 14 Testimonials manager (empty on purpose: only real customer quotes)
- [x] 15 Client logos manager (empty on purpose: only logos with permission)
- [x] 16 Downloads page (brochure PDF) — page and "downloads" section ready; brochure PDF from owner
- [x] 17 Newsletter signup (Brevo list, double opt-in) — list sync needs BREVO_LIST_ID
- [x] 18 All pages editable in admin
- [x] 19 Internal linking between industries and products
- [x] 20 Content review for human tone

## Phase 16 — Admin Completion, Backups & Polish
- [x] 01 Dashboard charts (enquiries per week, top products)
- [x] 02 Global admin search
- [x] 03 Redirect manager (301/302)
- [x] 04 Email templates preview and test send
- [x] 05 Settings: upload limits, allowed file types
- [x] 06 Settings: notification recipients (Settings > Enquiries and spam, Phase 14)
- [x] 07 Trash / restore for deleted items (30 days)
- [x] 08 Scheduled publish for posts (Phase 15: publishedAt in the future)
- [x] 09 Cache purge button (revalidate all tags)
- [x] 10 Neon backup schedule documented (docs/operations/backups.md)
- [~] 11 Restore drill on a Neon branch — procedure and log in docs/operations/backups.md; first drill needs the Neon account
- [x] 12 Health check endpoint (no secrets in output)
- [x] 13 Admin help tooltips on each field (hint text under fields in every editor)
- [x] 14 Empty states for every list
- [x] 15 Accessibility audit (axe) on public pages (tests/e2e/a11y.spec.mjs, 14 pages, 0 serious/critical)
- [x] 16 Accessibility audit on admin (8 pages, 0 serious/critical)
- [x] 17 Performance budget check (JS < 170 KB per route) — npm run budget; 164-167 KB gzip after moving zod, the enquiry forms and the footer newsletter out of the initial load
- [x] 18 Image audit (all alt texts present) — media library refuses alt-less images in use, dashboard counts missing alt, axe image-alt passes
- [x] 19 Final copy proofread
- [x] 20 Freeze features before security phases (from here on: security hardening, tests, SEO, launch only)

## Phase 17 — Security 1: SQL Injection & Injection Flaws
- [x] 01 List all injection types: classic, blind, time-based, second-order, ORM operator injection, JSON filter injection, header, log, command, template, LDAP-style
- [x] 02 Audit: all DB access through Prisma, no string-built SQL
- [x] 03 Any raw query uses Prisma.sql template only
- [x] 04 Block user-controlled orderBy/where keys (allow-list fields)
- [x] 05 Validate IDs (cuid format) before queries
- [x] 06 Search input: length limit, escape LIKE wildcards
- [x] 07 No eval, new Function, child_process with user data
- [x] 08 No dynamic import() from user input
- [x] 09 Sanitise data written to logs (strip CR/LF)
- [x] 10 CSV export: prefix =,+,-,@ cells to stop formula injection
- [x] 11 Email header injection: strip newlines in names/subjects
- [x] 12 Least-privilege Neon DB role for app (no superuser)
- [x] 13 Separate migration role
- [x] 14 JSON body size limit
- [x] 15 Prototype pollution guard (reject __proto__, constructor)
- [x] 16 Path traversal guard on any file path use
- [x] 17 ReDoS check of all regexes
- [x] 18 Add sqlmap-style test cases to test suite
- [x] 19 Document findings in docs/security/17.md
- [x] 20 Re-run full tests

## Phase 18 — Security 2: CSRF Protection
- [x] 01 List CSRF types: form POST, JSON with simple content types, login CSRF, logout CSRF, cookie tossing, subdomain attacks
- [x] 02 All auth cookies SameSite=Strict
- [x] 03 Double-submit CSRF token for all admin state-changing requests
- [x] 04 Verify Origin and Sec-Fetch-Site headers on POST/PUT/PATCH/DELETE
- [x] 05 Reject requests without Content-Type: application/json on JSON APIs
- [x] 06 Server Actions: confirm Next.js origin check is enabled, set allowedOrigins
- [x] 07 No state changes on GET
- [x] 08 Login CSRF: pre-session token on login form
- [x] 09 Logout via POST only
- [x] 10 __Host- cookie prefix for session cookies
- [x] 11 Rotate CSRF token on login
- [x] 12 Public forms protected by Turnstile + origin check
- [x] 13 frame-ancestors 'none' (clickjacking)
- [x] 14 Test cross-site form from another origin fails
- [x] 15 Test missing/invalid token returns 403
- [x] 16 Test Server Action from foreign origin fails
- [x] 17 Document all protected routes
- [x] 18 Add CSRF middleware unit tests
- [x] 19 Document in docs/security/18.md
- [x] 20 Re-run full tests

## Phase 19 — Security 3: Validation & File Upload Safety
- [x] 01 Zod schema for every API input (body, query, params)
- [x] 02 Strip unknown keys (.strict())
- [x] 03 Length limits on every string field
- [x] 04 Email, phone, URL, slug format validation
- [x] 05 Number ranges (quantity, order fields)
- [x] 06 Server-side re-validation even if client validated
- [x] 07 Rich text sanitised with DOMPurify allow-list
- [x] 08 File type allow-list (jpg, png, webp, avif, pdf)
- [x] 09 Magic-byte check, not only extension
- [x] 10 Size limits enforced server side and in Cloudinary preset
- [x] 11 Random file names, no user file names in paths
- [x] 12 PDF scan: reject files with JavaScript/embedded actions
- [x] 13 SVG blocked or sanitised
- [x] 14 Image re-encode via Cloudinary to strip payloads
- [x] 15 Max files per request and per minute
- [x] 16 Uploads only for authenticated roles with permission
- [x] 17 Error messages generic (no stack traces)
- [x] 18 Fuzz test inputs with random payloads
- [x] 19 Document in docs/security/19.md
- [x] 20 Re-run full tests

## Phase 20 — Security 4: XSS & CORS Lockdown (incl. tighter CORS)
- [x] 01 List XSS types: stored, reflected, DOM, mutation XSS, via SVG, via markdown, via URL (javascript:)
- [x] 02 No dangerouslySetInnerHTML except sanitised rich text
- [x] 03 Validate all link hrefs (http/https/mailto/tel only)
- [~] 04 CSP with per-request nonce and strict-dynamic — static CSP + SRI instead (PPR cannot carry nonces; see security/20.md)
- [x] 05 object-src 'none', base-uri 'self', form-action 'self'
- [~] 06 Trusted Types in report-only, then enforce — report-only live; enforce after reports are clean
- [x] 07 CSP report endpoint and monitoring
- [x] 08 Escape JSON-LD output (< → <)
- [x] 09 CORS: deny by default on all API routes
- [x] 10 CORS allow-list only for own origin(s); no *
- [x] 11 No Access-Control-Allow-Credentials with wildcard
- [x] 12 Preflight handling returns minimal headers
- [x] 13 Webhook routes accept only provider origin/IPs
- [x] 14 Remove CORS from admin APIs entirely (same-origin only)
- [x] 15 Cross-Origin-Resource-Policy: same-origin on API
- [x] 16 Cross-Origin-Opener-Policy: same-origin
- [x] 17 Test XSS payload list against every input
- [x] 18 Test cross-origin fetch blocked
- [x] 19 Document in docs/security/20.md
- [x] 20 Re-run full tests

## Phase 21 — Security 5: Broken Object & Function Level Authorization + Server-side Permissions
- [x] 01 List BOLA/IDOR, BFLA, mass assignment, privilege escalation cases
- [x] 02 Every admin route calls requireAdmin + can()
- [x] 03 Never trust role/userId sent from client
- [x] 04 Mass assignment: pick allowed fields explicitly per role
- [x] 05 Users cannot change own role
- [x] 06 Only SUPER_ADMIN manages users, MFA settings, theme publish
- [x] 07 Enquiry access scoped by assignment for EDITOR (if enabled)
- [x] 08 Draft content not readable via public API
- [x] 09 Media delete checks ownership/role
- [x] 10 Server Actions each check permission (not only page)
- [x] 11 Proxy/middleware not used as the only auth layer
- [x] 12 Hidden admin UI buttons are also blocked server side
- [x] 13 Sequential IDs not exposed (use cuid)
- [x] 14 Test matrix: each role × each endpoint
- [x] 15 Test IDOR by swapping IDs
- [x] 16 Test escalation via body role field
- [x] 17 Audit log on every permission denial
- [x] 18 Alert on repeated denials
- [x] 19 Document in docs/security/21.md
- [x] 20 Re-run full tests

## Phase 22 — Security 6: Rate Limiting & Abuse Control
- [x] 01 Upstash sliding-window limiter helper
- [x] 02 Login: 5 / 15 min per IP + per email
- [x] 03 OTP verify: 5 attempts per code, 10 / hour per user
- [x] 04 OTP resend: 60 s cooldown, 5 / hour
- [x] 05 Password reset request: 3 / hour per email and IP
- [x] 06 Public forms: 5 / hour per IP
- [x] 07 Search API: 60 / min per IP
- [x] 08 Upload: 30 / hour per admin
- [x] 09 Global API: 300 / min per IP
- [x] 10 Return 429 with Retry-After
- [x] 11 Exponential backoff on failed logins
- [~] 12 Cloudflare rate-limit rules as outer layer — rules written in security/22.md; apply when the domain is on Cloudflare
- [x] 13 Block list of abusive IPs (admin view)
- [x] 14 Bot score check on forms (Turnstile)
- [x] 15 Email bombing protection (per-recipient limits)
- [x] 16 Limits configurable in admin within safe caps
- [x] 17 Log rate-limit hits (no PII)
- [x] 18 Load test limits
- [x] 19 Document in docs/security/22.md
- [x] 20 Re-run full tests

## Phase 23 — Security 7: JWT, Tokens, OTP & Session Hygiene (no localStorage)
- [x] 01 Secrets ≥ 64 random bytes, different per environment
- [x] 02 Separate secrets for access JWT, refresh pepper, OTP pepper, TOTP key
- [x] 03 Algorithm pinned; reject alg:none and HS/RS confusion
- [x] 04 Always verify, never decode for auth decisions
- [x] 05 Validate iss, aud, exp, nbf
- [x] 06 Short access TTL (10 min), refresh 7 days
- [x] 07 Refresh rotation on every use + reuse detection
- [x] 08 tokenVersion bump on password change/reset/role change
- [x] 09 Old sessions killed after reset
- [x] 10 Reset links single use and expiring
- [x] 11 Email change needs password + OTP
- [x] 12 OTP never in API response, logs or URLs
- [x] 13 OTP expires, single use, hashed
- [x] 14 Same response for unknown email (no enumeration)
- [x] 15 Remove any token from localStorage/sessionStorage (audit code)
- [x] 16 Cookies HttpOnly, Secure, SameSite=Strict, __Host-
- [x] 17 Secret rotation procedure with key id (kid)
- [x] 18 Tests for every rule above
- [x] 19 Document in docs/security/23.md
- [x] 20 Re-run full tests

## Phase 24 — Security 8: Secrets Server-side, .env, Source Maps, Logs
- [x] 01 Audit all NEXT_PUBLIC_ vars; no secrets
- [x] 02 server-only import on every secret-using module
- [x] 03 Check client bundles for secret strings (build scan)
- [x] 04 Cloudinary signing only on server
- [x] 05 Brevo key only on server
- [x] 06 Disable production browser source maps
- [x] 07 Block /.env, /.git, *.map paths at edge (404)
- [x] 08 Secret scanning in CI (gitleaks)
- [x] 09 Pre-commit hook for secrets
- [~] 10 Vercel env vars marked sensitive — list and steps in security/24.md; set at deploy
- [x] 11 Structured logger with redaction (password, token, otp, cookie, authorization)
- [x] 12 Hash IPs in logs and DB
- [x] 13 No request bodies logged for auth routes
- [x] 14 Error responses generic; details only in server logs
- [x] 15 Remove console.log in production build
- [x] 16 Log retention policy (30 days)
- [x] 17 Rotate any secret that was ever committed
- [x] 18 Document secret inventory and owners
- [x] 19 Document in docs/security/24.md
- [x] 20 Re-run full tests

## Phase 25 — Security 9: Password Hashing & MFA Hardening
- [x] 01 argon2id params (memory 64 MB, t=3, p=1) benchmarked
- [x] 02 Password policy: 12+ chars, breached-password check (k-anonymity)
- [x] 03 Rehash on login if params changed
- [x] 04 Hash all stored secrets: refresh tokens, OTPs, reset tokens, recovery codes
- [x] 05 Encrypt TOTP secrets (AES-256-GCM, key from env)
- [x] 06 MFA mandatory for all admin roles
- [x] 07 TOTP replay prevention (store last used step)
- [x] 08 Recovery codes single use and regenerate flow
- [x] 09 MFA toggle needs OTP to default email
- [x] 10 Step-up auth for sensitive actions (users, theme publish, settings)
- [x] 11 Re-auth after 12 hours absolute session
- [x] 12 Idle timeout 30 min in admin
- [x] 13 Notify on MFA change, new device, password change
- [x] 14 Super admin cannot be deleted/demoted if last one
- [x] 15 Authorization re-checked after MFA (no partial session access)
- [x] 16 mfa_pending cookie cannot access any admin API
- [x] 17 Tests for MFA bypass attempts
- [x] 18 Tests for recovery code reuse
- [x] 19 Document in docs/security/25.md
- [x] 20 Re-run full tests

## Phase 26 — Security 10: Webhook Signatures & SSRF
- [x] 01 Inventory all webhooks (Brevo, Cloudinary)
- [x] 02 Cloudinary: verify X-Cld-Signature + timestamp
- [x] 03 Brevo: verify secret/token and IP allow-list
- [x] 04 Reject events older than 5 min (replay window)
- [x] 05 Store event IDs, reject duplicates (idempotency)
- [x] 06 Raw body used for signature check
- [x] 07 Constant-time signature compare
- [x] 08 Webhook routes rate limited
- [x] 09 SSRF list: URL upload, link previews, image proxy, webhooks out
- [x] 10 safeFetch: https only, resolve DNS, block private/loopback/link-local/169.254.169.254
- [x] 11 Re-check IP after redirects; limit redirects to 0-2
- [x] 12 Timeout 5 s, max size 10 MB
- [x] 13 Allow-list of content types
- [x] 14 next/image remotePatterns only Cloudinary
- [x] 15 Server Actions: protect against Host header SSRF (CVE-2024-34351 lesson)
- [x] 16 Block file:, gopher:, ftp: schemes
- [x] 17 Tests with internal IPs and DNS rebinding
- [x] 18 Tests for forged webhooks
- [x] 19 Document in docs/security/26.md
- [x] 20 Re-run full tests

## Phase 27 — Security 11: Dependencies, CDN, WAF, DDoS/DoS
- [x] 01 npm audit and fix all high/critical
- [x] 02 Renovate/Dependabot weekly
- [x] 03 Lockfile committed, npm ci in CI
- [x] 04 Remove unused packages
- [x] 05 Check package provenance and typosquats
- [x] 06 Pin Next.js and React to patched versions
- [~] 07 Cloudflare proxied DNS in front of Vercel — owner action, steps in security/27.md
- [~] 08 WAF managed rules (OWASP core set) — owner action, steps in security/27.md
- [~] 09 Custom WAF rules: block /admin outside allowed countries (optional), block bad user agents — owner action, steps in security/27.md
- [~] 10 DDoS protection on, "Under Attack" runbook — owner action, steps in security/27.md
- [~] 11 Cache static assets at edge, long TTL — owner action, steps in security/27.md
- [x] 12 Request size and timeout limits
- [~] 13 Slowloris/slow body protections (edge) — owner action, steps in security/27.md
- [x] 14 Origin lock: Vercel accepts only Cloudflare (secret header)
- [x] 15 Image optimisation abuse limits (sizes allow-list)
- [~] 16 Health monitoring and uptime alerts — owner action, steps in security/27.md
- [x] 17 Incident response runbook
- [x] 18 Load test 500 rps on public pages
- [x] 19 Document in docs/security/27.md
- [x] 20 Re-run full tests

## Phase 28 — Security 12: Anti-bot, Anti-scraping & Historic CVE Hardening
- [x] 01 Honest note: HTML sent to a browser can always be viewed; goal is to stop bulk bots and scrapers
- [~] 02 Cloudflare Bot Management / Super Bot Fight Mode on — Cloudflare, owner action (security/27.md, 28.md)
- [~] 03 Managed Challenge (puzzle page) for suspicious traffic, like AWS WAF CAPTCHA on big travel sites — Cloudflare Managed Challenge rule, owner action
- [~] 04 Turnstile on forms, search and downloads — Turnstile on forms; search/downloads use rate limits + Cloudflare challenge (decision in security/28.md)
- [~] 05 Block known scraper ASNs and headless signatures — Cloudflare rule, owner action
- [~] 06 Rate-based challenge on product pages — Cloudflare rate rule, owner action
- [x] 07 API responses need same-origin + token; no open JSON catalogue
- [x] 08 Documents (COA/SDS) behind signed expiring URLs
- [~] 09 Watermark images via Cloudinary overlay — needs the final logo; steps in security/28.md
- [~] 10 robots.txt disallow AI crawlers (GPTBot, CCBot etc.) if owner wants — switch in Settings -> SEO, off until the owner decides
- [x] 11 CVE-2025-29927 (Next.js middleware bypass): patched version + strip x-middleware-subrequest at edge
- [x] 12 CVE-2025-55182 / CVE-2025-66478 (RSC RCE): patched React/Next
- [x] 13 CVE-2024-34351 (Server Actions SSRF): patched + no relative redirects with user Host
- [x] 14 CVE-2024-46982 (Next.js cache poisoning): patched + no-store on dynamic routes
- [x] 15 jsonwebtoken CVE-2022-23529/23539/23540/23541 lessons: use jose, pin alg
- [x] 16 Prototype pollution CVEs (lodash, minimist): avoid/upgrade
- [x] 17 Log4Shell-style lesson: never evaluate strings from input in logs/templates
- [x] 18 Supply-chain lessons (event-stream, xz): lockfile, provenance, minimal deps
- [x] 19 Track CVE feed for Next.js, React, Prisma, jose monthly
- [x] 20 Document in docs/security/28.md

## Phase 29 — Security 13: UI Attack-surface Audit
- [x] 01 Clickjacking test (frame-ancestors none)
- [x] 02 Open redirect test on all ?next= / returnTo
- [x] 03 Tabnabbing: rel="noopener noreferrer" on external links
- [x] 04 Form autocomplete correct (one-time-code, current-password)
- [x] 05 No sensitive data in page source or RSC payload
- [x] 06 Error pages show no stack/framework details
- [x] 07 Admin URLs not linked from public site
- [x] 08 Copy/paste of OTP works but no OTP in URL
- [x] 09 File preview cannot run scripts
- [x] 10 Rich text output safe in all browsers
- [x] 11 Cookie banner cannot be bypassed to load trackers
- [x] 12 Third-party scripts minimal and SRI where static
- [x] 13 Map embed click-to-load only
- [x] 14 Mixed content check
- [x] 15 HTTPS redirect and HSTS preload ready
- [x] 16 Brute force UI lockout messaging generic
- [x] 17 Session expiry UX (redirect to login safely)
- [x] 18 Back button after logout shows no data (no-store)
- [x] 19 Browser devtools review of storage (no tokens)
- [x] 20 Document in docs/security/29.md

## Phase 30 — Security Testing (final, all attacks)
- [x] 01 Vitest unit tests for auth, guards, validators (≥ 90% on lib/auth, lib/security)
- [x] 02 Playwright E2E: login, OTP, TOTP, reset, logout, MFA toggle
- [x] 03 Automated SQLi payload suite
- [x] 04 Automated XSS payload suite
- [x] 05 CSRF suite
- [x] 06 IDOR/BFLA role matrix suite
- [x] 07 Rate-limit suite
- [x] 08 JWT tamper suite (alg none, expired, wrong aud, reused refresh)
- [x] 09 Upload suite (oversize, polyglot, SVG, PDF with JS)
- [x] 10 SSRF suite
- [x] 11 Webhook forgery suite
- [~] 12 OWASP ZAP baseline + full scan on staging — needs the staging URL; commands in security/REPORT.md
- [~] 13 Nuclei templates for Next.js on staging — needs the staging URL; commands in security/REPORT.md
- [~] 14 securityheaders.com and Mozilla Observatory A+ — needs the staging URL; commands in security/REPORT.md
- [~] 15 SSL Labs A+ — needs the staging URL; commands in security/REPORT.md
- [x] 16 Secret scan of repo and built bundle
- [x] 17 Dependency audit clean
- [~] 18 Manual pentest checklist (OWASP ASVS L2) — checklist written (security/asvs-l2.md); manual run on staging
- [x] 19 Fix all findings and re-test
- [x] 20 Final security report docs/security/REPORT.md

## Phase 31 — SEO (every page)
- [ ] 01 Metadata API on every route (title, description, canonical)
- [ ] 02 Title template "%s | Global India, Delhi"
- [ ] 03 Admin SEO fields per page/product/category/post
- [ ] 04 Open Graph + Twitter cards with Cloudinary OG images
- [ ] 05 JSON-LD helpers (next-seo style): Organization, LocalBusiness
- [ ] 06 Product schema (no fake prices), BreadcrumbList, FAQPage, Article
- [ ] 07 sitemap.js with all published URLs + lastmod
- [ ] 08 Image sitemap for product images
- [ ] 09 robots.js: allow site, disallow /admin, /api, sitemap link
- [ ] 10 Canonical URLs and trailing-slash policy
- [ ] 11 301 redirects from old globalindiachem.com URLs (map all ~120)
- [ ] 12 Clean slugs (no IDs)
- [ ] 13 Heading hierarchy check (one H1)
- [ ] 14 Internal linking: products ↔ categories ↔ industries
- [ ] 15 Geo pages: "Supplier in Delhi", "Delhi NCR"
- [ ] 16 Core Web Vitals: LCP < 2.5 s, CLS < 0.1, INP < 200 ms
- [ ] 17 Alt text audit
- [ ] 18 Google Search Console + Bing verification fields in admin
- [ ] 19 Google Business Profile link + NAP consistency
- [ ] 20 Lighthouse SEO 100 on key pages

## Phase 32 — Launch & Handover
- [ ] 01 Production env vars set and verified
- [ ] 02 Production Neon migration + seed (with flag, then removed)
- [ ] 03 Owner sets real email, logo, photos in admin
- [ ] 04 Brevo domain authenticated (SPF, DKIM, DMARC)
- [ ] 05 Cloudflare DNS cutover with WAF on
- [ ] 06 Old site URL redirects live
- [ ] 07 Final smoke test of every page and form
- [ ] 08 Super admin MFA set up by owner
- [ ] 09 Remove seed password from env
- [ ] 10 Backups verified
- [ ] 11 Uptime and error monitoring alerts
- [ ] 12 Submit sitemap to Search Console
- [ ] 13 Admin user guide (PDF) for owner
- [ ] 14 Video walkthrough of admin (optional)
- [ ] 15 Content entry training
- [ ] 16 Security runbook handover
- [ ] 17 Monthly maintenance checklist
- [ ] 18 Update all docs to final state
- [ ] 19 Update Memory.md progress log: complete
- [ ] 20 Sign-off from owner
