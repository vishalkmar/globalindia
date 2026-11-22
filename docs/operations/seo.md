# SEO — how the site is set up and what to do at launch

Audience: the site owner and whoever manages Search Console. Date: 23 November 2026 (Phase 31).

## What is already in place

| Area | Where it is managed |
|---|---|
| Title template "%s \| Global India, Delhi", default title and description, share image, favicon | Admin → Settings → SEO |
| Title, description, share image and "hide from search" per page, product, category, industry and article | Each editor's SEO panel |
| Canonical URL on every page; one address per page (no trailing slash, `/about/` → `/about`) | Automatic |
| Structured data: Organization + LocalBusiness (name, address, phone from Business details), Product, BreadcrumbList, FAQPage, Article, ItemList | Automatic; no ratings or prices are invented |
| `sitemap.xml` with last-changed dates and product/category/industry/article images | Automatic, refreshed when content changes and at least hourly |
| `robots.txt`: site open, `/admin`, `/api/`, `/d/` closed, sitemap link, optional AI-crawler block | Admin → Settings → SEO |
| 301 redirects from all 145 pages of the old site (`/…-13185592.html` → new product page) | Admin → Redirects (seeded from `prisma/data/old-site-urls.txt`) |
| Location pages: "Chemical supplier in Delhi", "Chemical supplier for Delhi NCR" (linked in the footer) | Admin → Pages |
| Google Business Profile link (contact page + structured data) | Admin → Settings → Business details |
| Search Console and Bing verification codes | Admin → Settings → SEO |

## Checks (automated)

- `tests/e2e/seo.spec.mjs`: 12 key pages each have one H1, a title with the brand under 75 characters,
  a description, an absolute canonical, `og:title`, and `alt` on every image; JSON-LD with the real
  address; sitemap and robots; old URLs answer 301; trailing slashes 308.
- `tests/unit/seo.test.js`: every old URL maps to an existing page; NAP in structured data equals the
  Business details; drafts and deleted items never appear in the sitemap.
- Admin dashboard shows "images without alt text" so the count stays at zero.

## Measurements (production build on the development laptop, 23 Nov 2026)

| Page | Lighthouse SEO | Desktop performance | Desktop LCP / CLS / TBT | Mobile (simulated slow phone) LCP / CLS |
|---|---|---|---|---|
| Home | 100 | 99 | 0.8 s / 0 / 10 ms | 3.9 s / 0 |
| Product (SLES 70%) | 100 | — | — | 4.1 s / 0.001 |
| Contact | 100 | 99 | 0.8 s / 0 / 40 ms | 4.3 s / 0 (was 0.135, fixed by reserving the form's height) |

Accessibility 100 and Best practices 96 on all three. The simulated mobile LCP is dominated by script
evaluation on a 4× slowed CPU (the largest item is React itself). Real-phone numbers come from Search
Console's Core Web Vitals report about four weeks after launch; if field LCP is above 2.5 s, the next
steps are moving more of the home page's interactive parts to lazy client components and serving
HTML from the Cloudflare edge cache.

## At launch (owner)

1. Google Search Console: add the domain property, paste the verification code in Admin → Settings →
   SEO, submit `https://<domain>/sitemap.xml`. Do the same in Bing Webmaster Tools.
2. Keep the old domain pointing to the new site so the 301s are followed; in Search Console use
   "Change of address" if the domain changes.
3. Google Business Profile: make the name, address and phone exactly match Admin → Business details,
   set the website to the new home page, and paste the profile's share link into Business details.
4. After four weeks, check Coverage (pages indexed), Core Web Vitals and the redirects' hit counts in
   Admin → Redirects.
