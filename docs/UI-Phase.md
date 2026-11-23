# UI Phase — premium business look, page by page

Goal (owner, 23 Nov 2026): a unique, premium, business-like UI on every page, public site and admin.
Better buttons and cards, no boxes-with-borders look, no monospace font, a light scroll reveal only.
No new features; performance and accessibility must not get worse (JS budget 170 KB, axe clean).

Status: [ ] to do, [x] done, [~] partly.

## UI-00 Foundation (affects every page)
- [x] 01 Remove monospace: `font-data`/`font-mono` use the body font with tabular numbers; drop mono font files
- [x] 02 Elevation scale: soft layered shadows (xs/sm/md/lg) instead of hard 1px borders
- [x] 03 Radius scale: buttons, inputs, cards, images, pills
- [x] 04 Buttons: primary with depth + hover lift, secondary, ghost, accent, icon, arrow-link; clear focus ring
- [x] 05 Cards: borderless elevated card, hover lift, media card, stat card, feature card
- [x] 06 Section heading: eyebrow pill with accent dot, display title, lead text width
- [x] 07 Badges and pills
- [x] 08 Form fields: taller inputs, soft fill, focus glow, clear errors
- [~] 09 Section rhythm: alternating tones, subtle background textures (no images), dividers
- [x] 10 Scroll reveal: fade-up on enter, once, CSS-only animation + tiny observer; off with reduced motion
- [~] 11 Images: rounded, soft shadow, consistent aspect ratios
- [~] 12 Tables: zebra-free clean rows, sticky header, tabular numbers

## UI-01 Site frame
- [x] 01 Top bar  - [x] 02 Header (glass on scroll)  - [x] 03 Mega menu  - [x] 04 Mobile drawer
- [x] 05 Footer (dark band, columns, newsletter)  - [x] 06 Floating contact  - [x] 07 Cookie banner  - [x] 08 Breadcrumbs

## UI-02 Home (14 sections)
- [x] 01 Hero  - [x] 02 Feature triad  - [x] 03 About teaser  - [x] 04 Product families
- [x] 05 Featured products  - [x] 06 Industries  - [x] 07 Numbered values  - [x] 08 Stats
- [x] 09 Process  - [x] 10 Client logos / testimonials  - [x] 11 Insights  - [x] 12 FAQ  - [x] 13 CTA band

## UI-03 Products hub (/products)
- [x] 01 Page hero  - [x] 02 Family filter chips  - [x] 03 Category cards  - [x] 04 Search box

## UI-04 Category page
- [x] 01 Hero with image  - [x] 02 Product table/cards  - [x] 03 Buying guide  - [x] 04 FAQ  - [x] 05 Related categories

## UI-05 Product page
- [x] 01 Hero (gallery + key facts)  - [x] 02 Sticky section nav  - [x] 03 Spec table  - [x] 04 Applications
- [x] 05 Packaging/MOQ cards  - [x] 06 Documents  - [x] 07 FAQ  - [x] 08 Quote CTA / add to quote

## UI-06 Company pages
- [x] 01 About (timeline, facts, proprietor)  - [x] 02 Why us  - [x] 03 Quality  - [x] 04 Gallery
- [x] 05 Careers  - [x] 06 Downloads  - [x] 07 Delhi / Delhi NCR pages

## UI-07 Industries  - [x] 01 List  - [x] 02 Detail
## UI-08 Insights  - [x] 01 List + topics + pagination  - [x] 02 Article (TOC, reading width)
## UI-09 Contact and utility pages
- [x] 01 Contact (tiles, tabs, forms, map)  - [x] 02 Thank you  - [x] 03 FAQ page  - [x] 04 Legal
- [x] 05 Newsletter confirm/confirmed  - [x] 06 404  - [x] 07 Maintenance

## UI-10 Admin sign-in  - [ ] 01 Login  - [ ] 02 Verify  - [ ] 03 Forgot/reset  - [ ] 04 Setup wizard
## UI-11 Admin shell and dashboard
- [ ] 01 Sidebar  - [ ] 02 Top bar, search, bell, account menu  - [ ] 03 Dashboard cards and charts
## UI-12 Admin lists
- [ ] 01 DataTable (products, categories, industries, insights, users, redirects, enquiries, audit, trash)
- [ ] 02 Filters and toolbar  - [ ] 03 Empty states
## UI-13 Admin editors
- [ ] 01 Product/category/industry/article editors  - [ ] 02 Page section editor  - [ ] 03 Settings forms
- [ ] 04 Theme  - [ ] 05 Menus
## UI-14 Admin media and tools  - [ ] 01 Media library  - [ ] 02 Gallery  - [ ] 03 Emails  - [ ] 04 My security
## UI-15 QA
- [ ] 01 Screenshots 360/768/1280/1536 every page  - [ ] 02 Contrast + axe  - [ ] 03 JS budget  - [ ] 04 Full E2E
