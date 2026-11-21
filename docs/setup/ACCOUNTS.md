# Third-party accounts — setup checklist

These steps need the owner's login, card or domain, so they cannot be done from code. The code is already wired to read the values from environment variables. Put development values in `.env.local` and production values in Vercel (mark every secret as **Sensitive**).

## 1. Neon (PostgreSQL) — Phase 1 todo 13
1. Create a project at neon.tech, region **AWS ap-south-1 (Mumbai)** (closest to Delhi).
2. Branches: keep `main` (production) and create `dev`.
3. Copy two connection strings from the `dev` branch:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** → `DIRECT_URL`
   Both must end with `?sslmode=require`.
4. Later (Phase 17): create a least-privilege role `gi_app` for the app and keep the owner role only for migrations.

Until Neon is ready, run `npm run db:local` (PGlite, no Docker needed) and use
`postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable&connection_limit=1&pgbouncer=true` for both URLs, and the same URL with port `5434` as `SHADOW_DATABASE_URL`.

On Neon, create a third branch `shadow` and use its direct URL as `SHADOW_DATABASE_URL` (only needed on machines that run `prisma migrate dev`).

## 2. Cloudinary — todo 14
1. Sign up, note **Cloud name**, **API key**, **API secret** → `CLOUDINARY_*`.
2. Media Library → create folders `global-india/dev` and `global-india/prod`.
3. Settings → Security: enable "Strict transformations", disable "Resource list" unsigned access.
4. Do **not** create an unsigned upload preset. All uploads are signed by our server.

## 3. Brevo — todo 15
1. Sign up, Senders & Domains → add the company domain, publish SPF, DKIM and DMARC records.
2. Add sender e.g. `no-reply@<domain>` → `BREVO_SENDER_EMAIL`, name `Global India` → `BREVO_SENDER_NAME`.
3. SMTP & API → create an API key → `BREVO_API_KEY` (server env only).
4. In development without a key, emails are written to `.dev-mail/` instead of being sent.

## 4. Upstash Redis — todo 16
1. Create a Redis database, region Mumbai.
2. Copy REST URL and token → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
3. Without these the app uses an in-memory limiter (fine for local dev, not for production).

## 5. Vercel — todo 17
1. Import the Git repository. Framework preset: Next.js. Root: repository root.
2. Environment variables: add every name from `.env.example` for **Production** and **Preview** separately (different secrets per environment — run `npm run secrets -- --force` in a scratch folder to generate a fresh set).
3. Build command `npm run build`; install command `npm ci`.
4. Connect Neon integration so each preview gets its own Neon branch.

## 6. Cloudflare (before launch, Phase 27/28/32)
Proxied DNS, WAF managed rules, Super Bot Fight Mode, Turnstile site key/secret → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`.
