import { Suspense } from "react";

import { CatalogueBrowser, CatalogueBrowserWithUrl } from "@/components/catalogue/CatalogueBrowser";
import { CtaBand } from "@/components/sections/ContentSections";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Layout";
import { getCatalogue } from "@/lib/catalogue/data";
import { siteUrl } from "@/lib/env";
import { SECTIONS } from "@/lib/sections/registry";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getSiteChrome } from "@/lib/site-chrome";

export const metadata = {
  title: "Products: Chemical Raw Materials in Delhi",
  description:
    "Surfactants, glycols, paraffins, glycerine, food additives, soap bases and finished home care products. Grades, CAS numbers and pack sizes, with COA and SDS on request.",
  alternates: { canonical: "/products" },
};

/** Products hub (Phase 12 todo 17): family filters, instant search, every category with its products. */
export default async function ProductsPage() {
  const [categories, chrome] = await Promise.all([getCatalogue(), getSiteChrome()]);
  const total = categories.reduce((n, c) => n + c.products.length, 0);
  const base = siteUrl();
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Products",
    url: `${base}/products`,
    hasPart: categories.map((c) => ({
      "@type": "CollectionPage",
      name: c.name,
      url: `${base}/products/${c.slug}`,
    })),
  };

  return (
    <>
      <section className="border-b border-line bg-surface" aria-labelledby="page-title">
        <Container className="flex flex-col items-start gap-5 py-12 md:py-16">
          <Breadcrumb items={[{ label: "Products" }]} />
          <Eyebrow>Product catalogue</Eyebrow>
          <h1 id="page-title" className="measure text-display">
            {total
              ? `${total} raw materials, ${categories.length} categories, one supplier.`
              : "Our product catalogue."}
          </h1>
          <p className="measure text-lead">
            Pick a family or type what you are looking for. Every product page lists the grade, CAS number,
            pack sizes and minimum order. Ask for the COA and SDS with your quote.
          </p>
        </Container>
      </section>
      <Section>
        <Container>
          {categories.length ? (
            <Suspense fallback={<CatalogueBrowser categories={categories} />}>
              <CatalogueBrowserWithUrl categories={categories} />
            </Suspense>
          ) : (
            <p className="text-muted">The catalogue is being updated. Please call us for current stock.</p>
          )}
        </Container>
      </Section>
      <CtaBand data={SECTIONS.ctaBand.defaults} ctx={{ contact: chrome.contact }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </>
  );
}
