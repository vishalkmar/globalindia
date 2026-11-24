import { Suspense } from "react";

import { CatalogueBrowser, CatalogueBrowserWithUrl } from "@/components/catalogue/CatalogueBrowser";
import { ProductShowcase } from "@/components/catalogue/ProductShowcase";
import { CtaBand } from "@/components/sections/ContentSections";
import { PhotoHero } from "@/components/site/PhotoHero";
import { Container, Section } from "@/components/ui/Layout";
import { getCatalogue } from "@/lib/catalogue/data";
import { siteUrl } from "@/lib/env";
import { SECTIONS } from "@/lib/sections/registry";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getSiteChrome } from "@/lib/site-chrome";
import { STOCK } from "@/lib/stockImages";

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
      <PhotoHero
        photo={STOCK.warehouseFloor}
        crumbs={[{ label: "Products" }]}
        eyebrow="Product catalogue"
        title={
          total ? `${total} raw materials, ${categories.length} categories, one supplier.` : "Our product catalogue."
        }
        lead="Pick a family or type what you are looking for. Every product page lists the grade, CAS number, pack sizes and minimum order. Ask for the COA and SDS with your quote."
      >
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Catalogue at a glance">
          {[
            `${total} products`,
            `${categories.length} categories`,
            "COA and SDS on request",
            "25 kg to 200 L packs",
          ].map((t) => (
            <li
              key={t}
              className="rounded-pill bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-band-ink ring-1 ring-white/20 backdrop-blur"
            >
              {t}
            </li>
          ))}
        </ul>
      </PhotoHero>
      <Section>
        <Container>
          {categories.length ? (
            <Suspense
                fallback={
                  <CatalogueBrowser categories={categories}>
                    <ProductShowcase categories={categories} />
                  </CatalogueBrowser>
                }
              >
              <CatalogueBrowserWithUrl categories={categories}>
                <ProductShowcase categories={categories} />
              </CatalogueBrowserWithUrl>
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
