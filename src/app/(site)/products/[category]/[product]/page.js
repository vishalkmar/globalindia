import { ArrowRight, Download, FileLock2, FlaskConical, Phone } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductAnchorNav } from "@/components/catalogue/ProductAnchorNav";
import { AddToQuote } from "@/components/enquiry/AddToQuote";
import { CtaBand, Faq } from "@/components/sections/ContentSections";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/Button";
import { Eyebrow, Tag } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Layout";
import { MediaImage } from "@/components/ui/MediaImage";
import { Table } from "@/components/ui/Table";
import { findRedirect, getProductPage, getProductParams } from "@/lib/catalogue/data";
import { familyByKey } from "@/lib/catalogue/families";
import { buildGuide, introFor } from "@/lib/catalogue/guide";
import { getIndustriesForProduct } from "@/lib/content/data";
import { siteUrl } from "@/lib/env";
import { SECTIONS } from "@/lib/sections/registry";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getSiteChrome } from "@/lib/site-chrome";
import { formatBytes } from "@/lib/utils";
import { SLUG_RE } from "@/lib/validation/catalogue";

/**
 * Product detail page, the "buyer's guide" (Phase 13). Static for every published product; unknown
 * slugs wait for the full render (ensureStatic) so a moved product answers with a permanent redirect
 * and anything else with a real 404.
 */
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  return getProductParams();
}

const DOC_NAMES = {
  COA: "Certificate of Analysis (COA)",
  SDS: "Safety Data Sheet (SDS)",
  TDS: "Technical Data Sheet (TDS)",
  BROCHURE: "Brochure",
  OTHER: "Document",
};

async function load(params) {
  const { category, product } = await params;
  if (!SLUG_RE.test(category) || !SLUG_RE.test(product)) return { missing: true };
  const p = await getProductPage(product);
  return { category, product, p };
}

export async function generateMetadata({ params }) {
  const { p, category } = await load(params);
  if (!p || p.category.slug !== category) return {};
  const seo = p.seo ?? {};
  return {
    title: seo.title ? { absolute: seo.title } : `${p.name} Supplier in Delhi, India`,
    description: seo.description || introFor(p).slice(0, 165),
    alternates: { canonical: `/products/${p.category.slug}/${p.slug}` },
    ...(seo.noindex ? { robots: { index: false } } : {}),
  };
}

function Heading({ id, eyebrow, title, intro }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {intro ? <p className="text-muted">{intro}</p> : null}
    </div>
  );
}

const Paras = ({ items }) => (
  <div className="flex measure flex-col gap-4 text-[1.0625rem] leading-relaxed text-ink">
    {items.map((t) => (
      <p key={t.slice(0, 40)}>{t}</p>
    ))}
  </div>
);

export default async function ProductPage({ params }) {
  const { p, category, product, missing } = await load(params);
  if (missing) notFound();
  if (!p) {
    const to = await findRedirect(`/products/${category}/${product}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  if (p.category.slug !== category) permanentRedirect(`/products/${p.category.slug}/${p.slug}`);

  const [chrome, industries] = await Promise.all([getSiteChrome(), getIndustriesForProduct(p.id)]);
  const family = familyByKey(p.category.family);
  const guide = buildGuide(p, { categorySlug: p.category.slug });
  const base = siteUrl();
  const url = `${base}/products/${p.category.slug}/${p.slug}`;
  const quote = `/contact?product=${encodeURIComponent(p.slug)}#quote`;

  const facts = [
    ["CAS number", p.casNo, true],
    ["Grade", p.grade],
    ["Purity", p.purity],
    ["Form", p.form],
    ["Pack sizes", p.packSizes.join(", ")],
    ["Minimum order", p.moq, true],
    ["Shelf life", p.shelfLife],
    ["Dispatch", p.dispatchTime],
  ].filter(([, v]) => v);

  const nav = [
    { id: "overview", label: "Overview" },
    { id: "sourcing", label: p.isSourced === false ? "How we make it" : "Sourcing" },
    { id: "applications", label: "Applications" },
    { id: "specifications", label: "Specifications" },
    { id: "ask", label: "Questions to ask" },
    { id: "packaging", label: "Packaging & storage" },
    { id: "documents", label: "Documents" },
    { id: "pricing", label: "Supply & price" },
    ...(p.faqs.length ? [{ id: "faqs", label: "FAQs" }] : []),
  ];

  const properties = [
    ...(p.casNo ? [{ "@type": "PropertyValue", name: "CAS number", value: p.casNo }] : []),
    ...p.specs.map((s) => ({ "@type": "PropertyValue", name: s.property, value: s.value })),
  ];
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: introFor(p),
    url,
    sku: p.slug,
    category: p.category.name,
    ...(p.image ? { image: [p.image.url, ...p.gallery.map((g) => g.url)] } : {}),
    ...(properties.length ? { additionalProperty: properties } : {}),
    // No price: prices are quoted on request, and a made-up price would be misleading (todo 17).
    offers: {
      "@type": "Offer",
      url,
      availability: "https://schema.org/InStock",
      areaServed: "IN",
      seller: { "@type": "Organization", name: chrome.business.name },
    },
  };

  return (
    <>
      {/* Hero (todos 01-04) */}
      <section className="border-b border-line bg-surface" aria-labelledby="product-title">
        <Container className="grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
          <div className="flex flex-col items-start gap-5">
            <Breadcrumb
              items={[
                { label: "Products", href: "/products" },
                { label: p.category.name, href: `/products/${p.category.slug}` },
                { label: p.name },
              ]}
            />
            <Eyebrow>Supplied from Delhi</Eyebrow>
            <h1 id="product-title" className="measure text-display">
              {p.name}
            </h1>
            <h2 className="font-sans text-[1.0625rem] font-semibold text-primary">
              {p.name} Supplier in Delhi, India
            </h2>
            <p className="measure text-lead">{introFor(p)}</p>
            <div className="flex flex-wrap gap-3">
              <Button href={quote} size="lg">
                Request quotation <ArrowRight aria-hidden="true" />
              </Button>
              <AddToQuote slug={p.slug} />
            </div>
            {chrome.contact.phone ? (
              <a
                href={chrome.contact.phoneHref}
                className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
              >
                <Phone aria-hidden="true" className="size-4" /> Call {chrome.contact.phone}
              </a>
            ) : null}
            {p.brandNote ? <p className="text-sm text-muted">{p.brandNote}</p> : null}
          </div>
          <div
            className={p.image || p.gallery.length ? "flex flex-col gap-3" : "hidden flex-col gap-3 lg:flex"}
          >
            {p.image ? (
              <MediaImage
                asset={p.image}
                aspect="4:3"
                priority
                sizes="(min-width: 1024px) 460px, 100vw"
                className="w-full rounded-card border border-line"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full flex-col justify-end gap-2 rounded-card border border-line bg-card p-6">
                <FlaskConical aria-hidden="true" className="size-8 text-primary/40" strokeWidth={1.25} />
                <p className="font-display text-xl text-primary">{p.name}</p>
                <p className="text-sm text-muted">
                  {[p.category.name, family?.name].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
            {p.gallery.length ? (
              <ul className="grid grid-cols-4 gap-2" aria-label="More photos">
                {p.gallery.slice(0, 4).map((g) => (
                  <li key={g.url}>
                    <MediaImage
                      asset={g}
                      aspect="1:1"
                      sizes="110px"
                      className="w-full rounded-btn border border-line"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Container>
        {facts.length ? (
          <div className="border-t border-line bg-card">
            <Container>
              <dl
                className="grid grid-cols-2 divide-line py-2 sm:grid-cols-3 lg:grid-cols-4"
                data-testid="fact-strip"
              >
                {facts.map(([k, v, mono]) => (
                  <div key={k} className="flex flex-col gap-0.5 px-1 py-3 sm:px-3">
                    <dt className="text-[0.75rem] font-bold tracking-[0.08em] text-muted uppercase">{k}</dt>
                    <dd
                      className={mono ? "font-data text-[0.9375rem] text-ink" : "text-[0.9375rem] text-ink"}
                    >
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </Container>
          </div>
        ) : null}
      </section>

      <ProductAnchorNav items={nav} />

      {/* 06 What is it */}
      <Section aria-labelledby="overview-title" id="overview" className="scroll-mt-12">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <Heading id="overview-title" eyebrow="Overview" title={`What is ${p.name}?`} />
          <Paras items={guide.whatIsIt} />
        </Container>
      </Section>

      {/* 07 How it is made / sourced */}
      <Section tone="surface" aria-labelledby="sourcing-title" id="sourcing" className="scroll-mt-12">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <Heading
            id="sourcing-title"
            eyebrow={p.isSourced === false ? "Made by us" : "Sourcing"}
            title={p.isSourced === false ? "How we make it." : "Where it comes from."}
          />
          <Paras items={guide.howMade} />
        </Container>
      </Section>

      {/* 08 Applications by industry */}
      <Section aria-labelledby="applications-title" id="applications" className="scroll-mt-12">
        <Container className="flex flex-col gap-8">
          <Heading id="applications-title" eyebrow="Applications" title={`What ${p.name} is used for.`} />
          {guide.industries.length ? (
            <Table
              stackOnMobile
              caption={`${p.name} applications by industry`}
              columns={[
                { key: "industry", label: "Industry", width: "30%" },
                { key: "use", label: "How it is used" },
              ]}
              rows={guide.industries.map((r, i) => ({
                id: i,
                industry: <strong className="font-semibold">{r.industry}</strong>,
                use: r.use,
              }))}
            />
          ) : guide.applications.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Applications">
              {guide.applications.map((a) => (
                <li key={a}>
                  <Tag>{a}</Tag>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">
              Tell us what you make and we will tell you whether this is the right material for it.
            </p>
          )}
          {industries.length ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold tracking-wide text-muted uppercase">
                Industries that buy it from us
              </h3>
              <ul className="flex flex-wrap gap-2" aria-label="Industries">
                {industries.map((ind) => (
                  <li key={ind.slug}>
                    <Tag href={`/industries/${ind.slug}`}>{ind.name}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </Section>

      {/* 09 Specifications (indicative) */}
      <Section tone="surface" aria-labelledby="specs-title" id="specifications" className="scroll-mt-12">
        <Container className="flex flex-col gap-8">
          <Heading
            id="specs-title"
            eyebrow="Specifications"
            title="Typical specification."
            intro="Indicative values from recent batches. The COA supplied with your batch is the final word."
          />
          {p.specs.length ? (
            <Table
              stackOnMobile
              caption={`${p.name} specification`}
              columns={[
                { key: "property", label: "Property", width: "34%" },
                { key: "value", label: "Typical value", data: true },
                { key: "method", label: "Method" },
              ]}
              rows={p.specs.map((s, i) => ({
                id: i,
                property: s.property,
                value: s.value,
                method: s.method || "—",
              }))}
              note="Specifications are indicative. Confirm the exact values on the COA supplied with your batch."
            />
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-card p-6">
              <p className="text-ink">
                We send the latest COA with your quote, so you see the values of the batch you will actually
                receive.
              </p>
              <Button href={quote} variant="secondary" size="sm">
                Ask for the COA
              </Button>
            </div>
          )}
        </Container>
      </Section>

      {/* 10 Ask the supplier */}
      <Section aria-labelledby="ask-title" id="ask" className="scroll-mt-12">
        <Container className="flex flex-col gap-8">
          <Heading
            id="ask-title"
            eyebrow="Before you buy"
            title="Questions to ask any supplier."
            intro="Ask us these too. A good supplier answers all of them without hesitation."
          />
          <Table
            stackOnMobile
            caption="Questions to ask the supplier"
            zebra={false}
            columns={[
              { key: "q", label: "Question", width: "40%" },
              { key: "why", label: "Why it matters" },
            ]}
            rows={guide.askSupplier.map((r, i) => ({
              id: i,
              q: <strong className="font-semibold">{r.question}</strong>,
              why: r.why,
            }))}
          />
        </Container>
      </Section>

      {/* 11 Packaging and storage */}
      <Section tone="surface" aria-labelledby="packaging-title" id="packaging" className="scroll-mt-12">
        <Container className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <Heading id="packaging-title" eyebrow="Packaging" title="Packs, minimum order and dispatch." />
            <dl className="grid gap-px overflow-hidden rounded-card border border-line bg-line">
              {[
                ["Pack sizes", p.packSizes.length ? p.packSizes.join(", ") : "On request"],
                ["Minimum order", p.moq || "On request"],
                ["Dispatch", p.dispatchTime || "Usually within 7 working days"],
                ["Labelling", "Product name and batch number on every pack"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] gap-4 bg-card px-5 py-3.5">
                  <dt className="text-sm font-semibold text-muted">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-6">
            <h3 className="text-h3">Storage and handling</h3>
            <Paras items={guide.storage} />
          </div>
        </Container>
      </Section>

      {/* 12 Documents */}
      <Section aria-labelledby="documents-title" id="documents" className="scroll-mt-12">
        <Container className="flex flex-col gap-8">
          <Heading
            id="documents-title"
            eyebrow="Documents"
            title="COA, SDS and technical data."
            intro="Public documents download straight away. Batch documents are sent with your quote or invoice."
          />
          <ul className="grid gap-3 md:grid-cols-2" data-testid="documents">
            {p.documents.map((d) =>
              d.isPublic ? (
                <li key={d.id}>
                  <a
                    href={`/d/${d.media.id}`}
                    rel="nofollow"
                    className="flex items-center gap-4 rounded-card border border-line bg-card px-5 py-4 transition-colors hover:border-primary"
                  >
                    <Download aria-hidden="true" className="size-5 shrink-0 text-primary" />
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold text-ink">{d.label || DOC_NAMES[d.type]}</span>
                      <span className="text-[0.8125rem] text-muted">PDF · {formatBytes(d.media.bytes)}</span>
                    </span>
                  </a>
                </li>
              ) : (
                <li key={d.id}>
                  <a
                    href={`/contact?product=${encodeURIComponent(p.slug)}&doc=${d.type}#quote`}
                    className="flex items-center gap-4 rounded-card border border-line bg-card px-5 py-4 transition-colors hover:border-primary"
                  >
                    <FileLock2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold text-ink">{d.label || DOC_NAMES[d.type]}</span>
                      <span className="text-[0.8125rem] text-muted">Sent on request with your enquiry</span>
                    </span>
                  </a>
                </li>
              ),
            )}
            {!p.documents.some((d) => d.type === "COA") ? (
              <li>
                <a
                  href={`/contact?product=${encodeURIComponent(p.slug)}&doc=COA#quote`}
                  className="flex items-center gap-4 rounded-card border border-dashed border-line px-5 py-4 transition-colors hover:border-primary"
                >
                  <FileLock2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-ink">Certificate of Analysis (COA)</span>
                    <span className="text-[0.8125rem] text-muted">Batch COA sent with your quote</span>
                  </span>
                </a>
              </li>
            ) : null}
            {!p.documents.some((d) => d.type === "SDS") ? (
              <li>
                <a
                  href={`/contact?product=${encodeURIComponent(p.slug)}&doc=SDS#quote`}
                  className="flex items-center gap-4 rounded-card border border-dashed border-line px-5 py-4 transition-colors hover:border-primary"
                >
                  <FileLock2 aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  <span className="flex flex-col">
                    <span className="font-semibold text-ink">Safety Data Sheet (SDS)</span>
                    <span className="text-[0.8125rem] text-muted">Sent on request</span>
                  </span>
                </a>
              </li>
            ) : null}
          </ul>
        </Container>
      </Section>

      {/* 13 Supply and pricing factors */}
      <Section tone="surface" aria-labelledby="pricing-title" id="pricing" className="scroll-mt-12">
        <Container className="flex flex-col gap-8">
          <Heading
            id="pricing-title"
            eyebrow="Supply and price"
            title="What decides the price."
            intro="We quote in writing, per kg or per litre, with GST and freight shown separately."
          />
          {p.showPrice && p.indicativePrice ? (
            <p className="rounded-card border border-line bg-card px-5 py-4">
              <span className="font-semibold text-ink">Indicative price: {p.indicativePrice}.</span>{" "}
              <span className="text-muted">
                For guidance only; your quote depends on grade, quantity and delivery city.
              </span>
            </p>
          ) : null}
          <Table
            stackOnMobile
            caption="Supply and pricing factors"
            columns={[
              { key: "factor", label: "Factor", width: "30%" },
              { key: "effect", label: "How it affects price or supply" },
            ]}
            rows={guide.pricingFactors.map((r, i) => ({
              id: i,
              factor: <strong className="font-semibold">{r.factor}</strong>,
              effect: r.effect,
            }))}
          />
        </Container>
      </Section>

      {/* 14 FAQs with FAQ schema */}
      {p.faqs.length ? (
        <div id="faqs" className="scroll-mt-12">
          <Faq
            tone="white"
            data={{ eyebrow: "FAQs", title: `${p.name}: questions buyers ask.`, intro: "", items: p.faqs }}
          />
        </div>
      ) : null}

      {/* 15 Related products */}
      {p.related.length ? (
        <Section tone={p.faqs.length ? "surface" : "white"} aria-labelledby="related-title">
          <Container className="flex flex-col gap-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <Heading id="related-title" eyebrow="Related" title="Buyers also ask about." />
              <Button href={`/products/${p.category.slug}`} variant="link">
                All {p.category.name} <ArrowRight aria-hidden="true" />
              </Button>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {p.related.map((r) => (
                <li key={r.id}>
                  <ProductCard product={r} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {/* 16 Closing CTA */}
      <CtaBand
        data={{ ...SECTIONS.ctaBand.defaults, cta: { text: "Request quotation", href: quote } }}
        ctx={{ contact: chrome.contact }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </>
  );
}
