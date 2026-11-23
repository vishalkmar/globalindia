import { ArrowRight, FileCheck, Phone } from "lucide-react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { CtaBand, Faq } from "@/components/sections/ContentSections";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Layout";
import { MediaImage } from "@/components/ui/MediaImage";
import { Table } from "@/components/ui/Table";
import { findRedirect, getCategoryPage, getCategorySlugs } from "@/lib/catalogue/data";
import { familyByKey } from "@/lib/catalogue/families";
import { siteUrl } from "@/lib/env";
import { SECTIONS } from "@/lib/sections/registry";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getSiteChrome } from "@/lib/site-chrome";
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
      <section className="hero-backdrop relative isolate overflow-hidden bg-surface" aria-labelledby="page-title">
        <Container
          className={
            c.image
              ? "grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
              : "py-12 md:py-16"
          }
        >
          <div className="flex flex-col items-start gap-5">
            <Breadcrumb
              items={[
                { label: "Products", href: "/products" },
                { label: family?.name ?? "Family", href: `/products?family=${family?.slug ?? ""}` },
                { label: c.name },
              ]}
            />
            <Eyebrow>{family?.name}</Eyebrow>
            <h1 id="page-title" className="measure text-display">
              {c.name}
            </h1>
            {c.intro ? <p className="measure text-lead">{c.intro}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button href={QUOTE}>
                Request a quote <ArrowRight aria-hidden="true" />
              </Button>
              {chrome.contact.phone ? (
                <Button href={chrome.contact.phoneHref} variant="secondary">
                  <Phone aria-hidden="true" /> {chrome.contact.phone}
                </Button>
              ) : null}
            </div>
          </div>
          {c.image ? (
            <MediaImage
              asset={c.image}
              aspect="4:3"
              priority
              sizes="(min-width: 1024px) 480px, 100vw"
              className="w-full surface-card"
            />
          ) : null}
        </Container>
      </section>

      <Section aria-labelledby="products-title">
        <Container className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h2 id="products-title" className="text-h2">
              {c.products.length === 1 ? "1 product" : `${c.products.length} products`} in this category
            </h2>
            <p className="flex items-center gap-2 text-sm text-muted">
              <FileCheck aria-hidden="true" className="size-4 text-primary" /> COA and SDS available on
              request
            </p>
          </div>
          {c.products.length ? (
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
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {c.related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/products/${r.slug}`}
                    className="lift flex items-center justify-between gap-3 surface-card px-5 py-4 transition-colors "
                  >
                    <span className="flex flex-col">
                      <span className="font-semibold text-primary">{r.name}</span>
                      <span className="text-[0.8125rem] text-muted">
                        {r._count.products === 1 ? "1 product" : `${r._count.products} products`}
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary" />
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
