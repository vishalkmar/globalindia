# Design.md — Global India Website

## 1. Direction

"Trusted Delhi trading house, modern catalogue." Calm, technical, print-like. Think a well-made chemical datasheet, not a startup landing page. Same structure and long-form behaviour as aveeroilsandfats.com, but our own palette, type and details — and better: correct breadcrumbs, real counters, open contact form, product catalogue.

**Banned (looks AI-generated):** purple/blue gradients, glowing gradient borders, glassmorphism blobs, emoji, 3D icon packs, sparkles, neon accents, centred-everything hero with three floating cards, stock handshake photos, rainbow icon colours, heavy drop shadows.

## 2. Colour — 3 colours + neutrals

| Token | Hex | Use |
|---|---|---|
| `--color-primary` (Deep Pine) | `#0F3B3A` | Header text, buttons, headings, footer background |
| `--color-primary-ink` | `#FFFFFF` | Text on primary |
| `--color-accent` (Brass) | `#B9852F` | Small highlights only: eyebrow lines, active nav underline, stat numbers, focus ring |
| `--color-surface` (Paper) | `#F6F4EF` | Alternating section background |
| `--color-ink` | `#16201F` | Body text |
| `--color-muted` | `#5B6766` | Secondary text |
| `--color-line` | `#DCD8CE` | 1 px borders, dividers |
| `--color-white` (Card) | `#FFFFFF` | Cards, alternating sections |
| `--color-success` / `--color-error` | `#2F6B3F` / `#A3352B` | Forms only |

Rules: accent < 5% of any screen. No gradients except a subtle photo overlay (primary 70% → 40%). Contrast AA minimum (body 4.5:1, large 3:1). All colours are CSS variables driven by the Theme manager. Presets: **Pine & Brass** (default), **Navy & Copper**, **Graphite & Saffron**, each with light and dark variants.

Dark mode (Pine & Brass): background `#0E1514`, surface `#131D1C`, card `#182423`, ink `#E8E6E0`, muted `#9DA8A6`, line `#2A3836`, primary `#7FB5AE` (used for headings/links on dark), accent `#D3A253`.

## 3. Typography

| Role | Font | Size desktop / mobile | Weight |
|---|---|---|---|
| Display H1 | Fraunces (serif, opsz) | 56 / 36 px, lh 1.08, tracking -0.01em | 500 |
| H2 | Fraunces | 40 / 28 px, lh 1.15 | 500 |
| H3 | Manrope | 22 / 19 px, lh 1.3 | 700 |
| Eyebrow | Manrope uppercase, tracking 0.14em | 12 px | 700, accent colour + 24 px line before |
| Body | Manrope | 17 / 16 px, lh 1.65 | 400 |
| Small / labels | Manrope | 13–14 px | 500 |
| Data (CAS, specs, MOQ) | JetBrains Mono | 14 px | 500 |

Max text width 68ch. Admin font whitelist: Fraunces, Source Serif 4, Newsreader (display); Manrope, Inter Tight, IBM Plex Sans, Work Sans (body); JetBrains Mono, IBM Plex Mono (data). All self-hosted via `next/font`, `display: swap`.

## 4. Layout, spacing, shape

- Container 1240 px, gutters 24 px desktop / 16 px mobile; 12-column grid.
- Spacing scale 4-8-12-16-24-32-48-64-96-128. Section padding 96 px desktop, 64 px mobile.
- Radius: 6 px buttons/inputs, 10 px cards, 0 on full-width bands. Shadows almost never; 1 px `--color-line` borders instead.
- Cards: white, 1 px border, 24–32 px padding; hover = border turns primary + 2 px lift (transform, 150 ms). No glow.
- Images: real plant/warehouse/drum/bag photos, natural colour, slight desaturation; 4:3 or 16:9; never AI-rendered beakers.

## 5. Icons

lucide-react only, stroke 1.5, 20/24 px, colour = primary (white on dark). Icons sit in a 44 px square with 1 px border — never in coloured circles. Industry icons: Utensils (food), Droplet (cosmetics), Pill (pharma), WashingMachine (detergents), Factory (textile/industrial), FlaskConical (labs), Car (auto), Beaker / Soap (soap making). No emoji anywhere (lint rule).

## 6. Components (all admin-data driven)

TopBar · Header (sticky after 120 px with white bg + border, shrink) · MegaMenu (6 families × categories, one featured product, no images) · Breadcrumb (always correct, JSON-LD) · Hero (photo bg, eyebrow, H1, sub, 2 buttons, 3 trust facts) · StatsStrip (server-rendered numbers; count-up only as enhancement) · FeatureTriad · AboutTeaser + pull quote · ClientLogoStrip (grey, colour on hover) · NumberedValues 01–04 · ProductFamilyGrid · ProductCard (name, CAS, grade, pack, "View details") · IndustryGrid · ProcessSteps · SpecTable · ComparisonTable · AnchorNav (sticky) · FAQAccordion · DocumentDownloads (COA/SDS/TDS) · QuoteForm (multi-step) · CTA band (primary bg) · Testimonial · GalleryGrid · Footer (4 columns + bottom bar) · floating Call/WhatsApp button (SVG, optional).

Base UI (Phase 2): Button (primary, secondary, ghost, link; sm/md/lg; loading), Input, Textarea, Select, Checkbox, Radio, FileDrop, Card, Badge, Tag, Divider, Eyebrow, Dialog, Drawer, Tabs, Accordion, Table, IconBox, Toast, Skeleton.

## 7. Page blueprints (reference structure, improved)

**Home:** TopBar → Header → Hero → 3 trust facts → FeatureTriad → About teaser + pull quote (Akash Rathod) → Product families grid (6) → Featured products (6) → Industries (8) → Numbered values 01–04 → Stats strip → How ordering works (4 steps) → Client logos (if allowed) → Testimonials → Insights preview (3) → FAQ (6) → CTA band → Footer.

**About:** breadcrumb hero → story (2002 to today) → timeline → key facts table → vision & mission → values → warehouse & logistics → proprietor quote → CTA form.

**Products hub:** hero → family tabs + search → category cards with counts → "How to request a quote" → logos → CTA.

**Category:** hero → intro → product table/cards (name, CAS, grade, pack, MOQ) → buying guide → FAQ → CTA.

**Product (buyer's guide):** eyebrow "Supplied from Delhi" → H1 + H2 "[Product] Supplier in Delhi, India" → intro → CTAs (Request quotation, Call) → fact strip (CAS, grade, purity, pack, MOQ, shelf life) → sticky anchor nav → What is it → How it is made/sourced → Applications by industry → Specifications (indicative) → Ask the supplier → Packaging & storage → Documents → Supply & pricing factors → FAQs → Related products → closing CTA.

**Also:** Industries (list + detail), Why Us, Quality & Documentation, Gallery, Careers (toggle), Insights, FAQ, Contact (address/phone/email tiles, click-to-load map, open form, Turnstile), Legal (Privacy, Terms, Cookie, Shipping, Disclaimer).

## 8. Motion

Subtle only: fade-up 12 px on scroll (IntersectionObserver, once), count-up stats, sticky header shrink, mega-menu 150 ms fade, accordion height animation. Respect `prefers-reduced-motion`. No parallax, no autoplay sliders (admin may enable a 3-slide manual slider).

## 9. Admin panel design

Same tokens, denser (14 px base). Left sidebar (Dashboard, Pages, Products, Categories, Media, Enquiries, Insights, Theme, Menus, Settings, Users, Security, Audit log), top bar with user menu. Tables with search, filters, pagination. Forms in cards with sticky Save / Publish / Preview bar. Live preview pane for sections and theme. Drag-to-reorder where order matters. Login screens: plain split layout, no illustrations.

## 10. Copy voice

Good: "We stock Light Liquid Paraffin in 50 L carboys and 210 L drums. Viscosity and grade are confirmed on the COA that travels with every batch."
Bad: "Experience unparalleled excellence with our revolutionary paraffin solutions."
