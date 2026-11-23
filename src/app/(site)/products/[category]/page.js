import { ArrowRight, ChevronDown, FileCheck, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { CtaBand, Faq } from "@/components/sections/ContentSections";
import { PhotoHero } from "@/components/site/PhotoHero";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Layout";
import { Table } from "@/components/ui/Table";
import { findRedirect, getCategoryPage, getCategorySlugs } from "@/lib/catalogue/data";
import { familyByKey } from "@/lib/catalogue/families";
import { siteUrl } from "@/lib/env";
import { SECTIONS } from "@/lib/sections/registry";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getSiteChrome } from "@/lib/site-chrome";
import { FAMILY_IMAGE, imageForText, STOCK } from "@/lib/stockImages";
import { SLUG_RE } from "@/lib/validation/catalogue";

/**
 * Category page (Phase 12 todo 18): products table, buying guide, FAQs and related categories.
 * ensureStatic = "navigation": unknown slugs wait for the full render, so an old slug can answer with
 * a permanent redirect (todo 19) and anything else with a real 404 status.
 */
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  return (await getCategorySlugs()).map((category) => ({ category }));
}

export async function generateMetadata({ params }) {
  const { category: slug } = await params;
  if (!SLUG_RE.test(slug)) return {};
  const c = await getCategoryPage(slug);
  if (!c) return {};
  const seo = c.seo ?? {};
  return {
    title: seo.title ? { absolute: seo.title } : `${c.name} Supplier in Delhi`,
    description: seo.description || c.intro || undefined,
    alternates: { canonical: `/products/${c.slug}` },
    ...(seo.noindex ? { robots: { index: false } } : {}),
  };
}

const QUOTE = "/contact#quote";

export default async function CategoryPage({ params }) {
  const { category: slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();
  const c = await getCategoryPage(slug);
  if (!c) {
    const to = await findRedirect(`/products/${slug}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  const chrome = await getSiteChrome();
  const family = familyByKey(c.family);
  const guide = sanitizeRichText(c.guide ?? "");
  const base = siteUrl();

  const rows = c.products.map((p) => ({
    id: p.id,
    name: (
      <Link
        href={`/products/${c.slug}/${p.slug}`}
        className="font-semibold text-primary hover:underline hover:underline-offset-4"
      >
        {p.name}
      </Link>
    ),
    cas: p.casNo || "—",
    grade: [p.grade, p.purity].filter(Boolean).join(" · ") || "—",
    form: p.form || "—",
    packs: p.packSizes.join(", ") || "On request",
    moq: p.moq || "On request",
  }));

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: c.name,
    numberOfItems: c.products.length,
    itemListElement: c.products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: `${base}/products/${c.slug}/${p.slug}`,
    })),
  };

  return (
    <>
      <PhotoHero
        photo={c.image ? { src: c.image.url } : (FAMILY_IMAGE[c.family] ?? STOCK.labPipette)}
        crumbs={[
          { label: "Products", href: "/products" },
          { label: family?.name ?? "Family", href: `/products?family=${family?.slug ?? ""}` },
          { label: c.name },
        ]}
        eyebrow={family?.name}
        title={c.name}
        lead={c.intro}
        aside={
          <dl className="hidden grid-cols-2 gap-3 sm:grid">
            {[
              [String(c.products.length), c.products.length === 1 ? "Product in stock" : "Products in stock"],
              ["COA", "With every batch"],
              ["25 kg+", "Pack sizes"],
              ["7 days", "Usual dispatch"],
            ].map(([v, k]) => (
              <div
                key={k}
                className="flex flex-col gap-1 rounded-card bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur"
              >
                <dt className="order-2 text-sm text-band-ink/70">{k}</dt>
                <dd className="order-1 text-[1.75rem] leading-none font-extrabold tracking-tight text-band-ink">{v}</dd>
              </div>
            ))}
          </dl>
        }
      >
        <div className="flex flex-wrap gap-3 pt-1">
          <Button href={QUOTE} variant="onBand" size="lg">
            Request a quote <ArrowRight aria-hidden="true" />
          </Button>
          {chrome.contact.phone ? (
            <Button href={chrome.contact.phoneHref} variant="onBandOutline" size="lg">
              <Phone aria-hidden="true" /> {chrome.contact.phone}
            </Button>
          ) : null}
        </div>
      </PhotoHero>

      <Section aria-labelledby="products-title">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3">
              <Eyebrow>In this category</Eyebrow>
              <h2 id="products-title" className="text-h2">
                {c.products.length === 1 ? "1 product" : `${c.products.length} products`}, ready to quote.
              </h2>
            </div>
            <p className="inline-flex items-center gap-2 self-start rounded-pill bg-[color-mix(in_oklab,var(--c-success)_10%,transparent)] px-3.5 py-2 text-sm font-semibold text-success md:self-auto">
              <FileCheck aria-hidden="true" className="size-4" /> COA and SDS available on request
            </p>
          </div>
          {c.products.length ? (
            <>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {c.products.map((p) => (
                  <li key={p.id} data-reveal>
                    <ProductCard product={{ ...p, category: { slug: c.slug, name: c.name, family: c.family } }} />
                  </li>
                ))}
              </ul>
              <details className="group overflow-hidden rounded-card bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-ink hover:text-primary">
                  Compare all {c.products.length} side by side
                  <ChevronDown aria-hidden="true" className="size-5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-hairline p-3 md:p-4">
                  <Table
                    caption={`${c.name} products`}
                    columns={[
                      { key: "name", label: "Product", width: "28%" },
                      { key: "cas", label: "CAS", data: true },
                      { key: "grade", label: "Grade / purity" },
                      { key: "form", label: "Form" },
                      { key: "packs", label: "Packs" },
                      { key: "moq", label: "MOQ", data: true },
                    ]}
                    rows={rows}
                    note="Specifications are indicative. Confirm the exact values on the COA supplied with your batch."
                  />
                </div>
              </details>
            </>
          ) : (
            <p className="text-muted">
              Products in this category are being updated. Call us for current stock.
            </p>
          )}
        </Container>
      </Section>

      {guide ? (
        <Section tone="surface" aria-labelledby="guide-title">
          <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
            <div className="flex flex-col gap-3">
              <Eyebrow>Buying guide</Eyebrow>
              <h2 id="guide-title" className="text-h2">
                What to check before you order {c.name}.
              </h2>
            </div>
            <div className="prose-site measure" dangerouslySetInnerHTML={{ __html: guide }} />
          </Container>
        </Section>
      ) : null}

      {c.faqs.length ? (
        <Faq
          tone={guide ? "white" : "surface"}
          data={{ eyebrow: "Questions", title: `${c.name}: questions buyers ask.`, intro: "", items: c.faqs }}
        />
      ) : null}

      {c.related.length ? (
        <Section tone={guide && !c.faqs.length ? "white" : "surface"} aria-labelledby="related-title">
          <Container className="flex flex-col gap-6">
            <h2 id="related-title" className="text-h3">
              More in {family?.name}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.related.map((r) => (
                <li key={r.slug} data-reveal>
                  <Link
                    href={`/products/${r.slug}`}
                    className="group lift flex items-center gap-4 surface-card p-3 pr-5"
                  >
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-btn">
                      <Image
                        src={imageForText(r.name, FAMILY_IMAGE[c.family] ?? STOCK.labPipette).src}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-110"
                      />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold text-ink group-hover:text-primary">{r.name}</span>
                      <span className="text-[0.8125rem] text-muted">
                        {r._count.products === 1 ? "1 product" : `${r._count.products} products`}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <CtaBand data={SECTIONS.ctaBand.defaults} ctx={{ contact: chrome.contact }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
    </>
  );
}
