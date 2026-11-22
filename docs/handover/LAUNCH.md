# Launch and handover checklist

Audience: the site owner and the developer doing the launch together. Tick each line on the day.
Details for every step are in the linked documents.

## Before launch day

| # | Step | Who | Done |
|---|---|---|---|
| 1 | Reset the Neon `neondb_owner` password (it was shared in a chat). Put the new owner URL in Vercel as `DIRECT_URL` and the `gi_app` URL as `DATABASE_URL` (docs/security/17.md, 24.md) | Owner + dev | ☐ |
| 2 | Vercel → Environment variables: every secret from `.env.example`, marked **Sensitive**, different values for Preview and Production (`npm run secrets` once per environment). Add Upstash (shared rate limits), Brevo, Cloudinary, Turnstile, `CRON_SECRET` (docs/security/24.md) | Dev | ☐ |
| 3 | Production database: migrations applied and seeded (done on 22–23 Nov 2026 on Neon `globalindia`: catalogue, pages, location pages, 145 redirects). Re-run `prisma migrate deploy` in the Vercel build | Dev | ☐ |
| 4 | Owner signs in as super admin, sets a new password, sets up the authenticator, prints recovery codes. Adds a second super admin | Owner | ☐ |
| 5 | Remove `SEED_ADMIN_PASSWORD` (and `ALLOW_PROD_SEED`) from every environment | Dev | ☐ |
| 6 | Admin → Business details: real email(s), logo, Google Business Profile link; Media: real photos with alt text; Downloads: brochure; check legal pages with a lawyer/CA | Owner | ☐ |
| 7 | Brevo: authenticate the sending domain (SPF, DKIM, DMARC records in DNS), set sender email, add the webhook (docs/security/26.md). Send yourself a test from Admin → Emails | Owner + dev | ☐ |
| 8 | Cloudinary: turn on Strict transformations and restricted PDF delivery; add the webhook (docs/security/27.md, 28.md) | Dev | ☐ |
| 9 | Admin → Menus: add the Delhi / Delhi NCR pages to the footer quick links (the live database had menus before these pages existed) | Owner | ☐ |

## Launch day

| # | Step | Who | Done |
|---|---|---|---|
| 10 | Cloudflare: domain added, DNS proxied to Vercel, SSL Full (strict), WAF managed rules + OWASP set, rate-limit rules, Bot Fight Mode, origin-lock header + `ORIGIN_LOCK_SECRET` in Vercel (docs/security/27.md) | Dev | ☐ |
| 11 | Point the old domain (www and non-www) at the new site so the 145 old addresses redirect | Dev | ☐ |
| 12 | `node scripts/smoke.mjs https://<domain>`: every sitemap page, headers, robots, admin, 404 and redirects. Then send one real enquiry from each form and check the emails | Dev + owner | ☐ |
| 13 | securityheaders.com, Mozilla Observatory and SSL Labs for the domain; ZAP baseline and Nuclei on staging (commands in docs/security/REPORT.md) | Dev | ☐ |
| 14 | Search Console and Bing: verify (codes in Admin → Settings → SEO), submit `/sitemap.xml`; "Change of address" if the domain changed (docs/operations/seo.md) | Owner | ☐ |
| 15 | Uptime monitor on `/` and `/api/health` every minute, alerts to owner and developer; Vercel alert for 5xx above 1 % | Dev | ☐ |
| 16 | Backups: confirm Neon point-in-time restore window; do one test restore to a branch (docs/operations/backups.md) | Dev | ☐ |

## Handover

| # | Item | Where | Done |
|---|---|---|---|
| 17 | Admin guide (PDF) walked through with the owner and team | `docs/handover/admin-guide.pdf` | ☐ |
| 18 | Content entry practice: each team member adds one product, edits one page section, answers one test enquiry | With the developer | ☐ |
| 19 | Optional screen recording of the admin walkthrough | Owner's choice | ☐ |
| 20 | Security runbooks explained (Under Attack, incident response, secret rotation) | `docs/security/27.md`, `23.md`, `24.md` | ☐ |
| 21 | Monthly maintenance checklist agreed | `docs/handover/MAINTENANCE.md` | ☐ |
| 22 | Owner sign-off | Name, date, signature below | ☐ |

Signed off by: ______________________  Date: ____________
