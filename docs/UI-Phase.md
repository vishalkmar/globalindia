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
- [x] 09 Section rhythm: alternating tones, subtle background textures (no images), dividers
- [x] 10 Scroll reveal: fade-up on enter, once, CSS-only animation + tiny observer; off with reduced motion
- [x] 11 Images: rounded, soft shadow, consistent aspect ratios
- [x] 12 Tables: zebra-free clean rows, sticky header, tabular numbers

## UI-01 Site frame
- [ ] 01 Top bar  - [ ] 02 Header (glass on scroll)  - [ ] 03 Mega menu  - [ ] 04 Mobile drawer
- [ ] 05 Footer (dark band, columns, newsletter)  - [ ] 06 Floating contact  - [ ] 07 Cookie banner  - [ ] 08 Breadcrumbs

## UI-02 Home (14 sections)
- [ ] 01 Hero  - [ ] 02 Feature triad  - [ ] 03 About teaser  - [ ] 04 Product families
- [ ] 05 Featured products  - [ ] 06 Industries  - [ ] 07 Numbered values  - [ ] 08 Stats
- [ ] 09 Process  - [ ] 10 Client logos / testimonials  - [ ] 11 Insights  - [ ] 12 FAQ  - [ ] 13 CTA band

## UI-03 Products hub (/products)
- [ ] 01 Page hero  - [ ] 02 Family filter chips  - [ ] 03 Category cards  - [ ] 04 Search box

## UI-04 Category page
- [ ] 01 Hero with image  - [ ] 02 Product table/cards  - [ ] 03 Buying guide  - [ ] 04 FAQ  - [ ] 05 Related categories

## UI-05 Product page
- [ ] 01 Hero (gallery + key facts)  - [ ] 02 Sticky section nav  - [ ] 03 Spec table  - [ ] 04 Applications
- [ ] 05 Packaging/MOQ cards  - [ ] 06 Documents  - [ ] 07 FAQ  - [ ] 08 Quote CTA / add to quote

## UI-06 Company pages
- [ ] 01 About (timeline, facts, proprietor)  - [ ] 02 Why us  - [ ] 03 Quality  - [ ] 04 Gallery
- [ ] 05 Careers  - [ ] 06 Downloads  - [ ] 07 Delhi / Delhi NCR pages

## UI-07 Industries  - [ ] 01 List  - [ ] 02 Detail
## UI-08 Insights  - [ ] 01 List + topics + pagination  - [ ] 02 Article (TOC, reading width)
## UI-09 Contact and utility pages
- [ ] 01 Contact (tiles, tabs, forms, map)  - [ ] 02 Thank you  - [ ] 03 FAQ page  - [ ] 04 Legal
- [ ] 05 Newsletter confirm/confirmed  - [ ] 06 404  - [ ] 07 Maintenance

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
