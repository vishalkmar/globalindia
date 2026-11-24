import {
  ArrowRight,
  Boxes,
  CalendarClock,
  CircleCheck,
  Download,
  Factory,
  FileLock2,
  Layers,
  MessageCircleQuestion,
  Package,
  Phone,
  Scale,
  ShieldCheck,
  Tags,
  Truck,
} from "lucide-react";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";

import { ProductAnchorNav } from "@/components/catalogue/ProductAnchorNav";
import { AddToQuote } from "@/components/enquiry/AddToQuote";
import { CtaBand } from "@/components/sections/ContentSections";
import { PhotoHero } from "@/components/site/PhotoHero";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/Button";
import { Eyebrow, Tag } from "@/components/ui/Card";
import { Carousel } from "@/components/ui/Carousel";
import { Container, Section } from "@/components/ui/Layout";
import { MediaImage } from "@/components/ui/MediaImage";
import { Accordion } from "@/components/ui/Tabs";
import { findRedirect, getProductPage, getProductParams } from "@/lib/catalogue/data";
import { familyByKey } from "@/lib/catalogue/families";
import { buildGuide, introFor } from "@/lib/catalogue/guide";
import { getIndustriesForProduct } from "@/lib/content/data";
import { siteUrl } from "@/lib/env";
import { SECTIONS } from "@/lib/sections/registry";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getSiteChrome } from "@/lib/site-chrome";
import { imageForProduct, imageForText, STOCK } from "@/lib/stockImages";
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

const PRICE_ICONS = [Scale, Layers, Truck, CalendarClock];

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
  const productPhoto = imageForProduct(p);

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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

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
      {/* Hero (todos 01-04): photo band, product photo on the right, fact strip rising over the edge */}
      <PhotoHero
        photo={STOCK.warehouseFloor}
        titleId="product-title"
        crumbs={[
          { label: "Products", href: "/products" },
          { label: p.category.name, href: `/products/${p.category.slug}` },
          { label: p.name },
        ]}
        eyebrow="Supplied from Delhi"
        title={p.name}
        aside={
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--r-card)+6px)] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] ring-1 ring-white/20">
              {p.image ? (
                <MediaImage asset={p.image} aspect="4:3" priority sizes="(min-width: 1024px) 460px, 100vw" className="h-full w-full" />
              ) : (
                <Image
                  src={productPhoto.src}
                  alt={productPhoto.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 460px, 100vw"
                  className="object-cover"
                />
              )}
              {p.casNo ? (
                <span className="absolute top-4 left-4 rounded-pill bg-white/92 px-3 py-1 text-xs font-bold text-primary tabular-nums shadow-sm">
                  CAS {p.casNo}
                </span>
              ) : null}
              <span className="absolute right-4 bottom-4 inline-flex items-center gap-1.5 rounded-pill bg-[color-mix(in_oklab,var(--c-band)_85%,transparent)] px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> In stock
              </span>
            </div>
            {p.gallery.length ? (
              <ul className="grid grid-cols-4 gap-2" aria-label="More photos">
                {p.gallery.slice(0, 4).map((g) => (
                  <li key={g.url}>
                    <MediaImage asset={g} aspect="1:1" sizes="110px" className="w-full rounded-btn ring-1 ring-white/20" />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        }
      >
        <p className="text-[1.0625rem] font-semibold text-accent">{p.name} Supplier in Delhi, India</p>
        <p className="max-w-2xl text-lead text-[color-mix(in_oklab,var(--c-band-ink)_78%,transparent)]">{introFor(p)}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button href={quote} size="lg" variant="onBand">
            Request quotation <ArrowRight aria-hidden="true" />
          </Button>
          <AddToQuote slug={p.slug} />
        </div>
        {chrome.contact.phone ? (
          <a
            href={chrome.contact.phoneHref}
            className="inline-flex items-center gap-2 font-semibold text-band-ink hover:underline"
          >
            <Phone aria-hidden="true" className="size-4" /> Call {chrome.contact.phone}
          </a>
        ) : null}
        {p.brandNote ? <p className="text-sm text-band-ink/70">{p.brandNote}</p> : null}
      </PhotoHero>
      {facts.length ? (
        <div className="relative z-10 -mt-8 md:-mt-10">
          <Container>
            <dl
              className="grid grid-cols-2 overflow-hidden rounded-[calc(var(--r-card)+4px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-lg)] sm:grid-cols-3 lg:grid-cols-4"
              data-testid="fact-strip"
            >
              {facts.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 px-5 py-4 shadow-[inset_-1px_-1px_0_var(--hairline)]">
                  <dt className="text-[0.6875rem] font-bold tracking-[0.1em] text-muted uppercase">{k}</dt>
                  <dd className="text-[0.9375rem] font-semibold text-ink tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Container>
        </div>
      ) : null}

      <ProductAnchorNav items={nav} />

      <div className="bg-[linear-gradient(180deg,var(--c-bg),var(--c-surface))]">
        <Container className="grid gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-12">
          <div className="flex min-w-0 flex-col gap-16 md:gap-20">
            {/* 06 What is it: text beside the product photo */}
            <section aria-labelledby="overview-title" id="overview" className="scroll-mt-32">
              <div className="grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center">
                <div data-reveal className="flex flex-col gap-5">
                  <Heading id="overview-title" eyebrow="Overview" title={`What is ${p.name}?`} />
                  <Paras items={guide.whatIsIt} />
                </div>
                <div data-reveal className="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--r-card)+6px)] shadow-lg md:aspect-[4/5]">
                  {p.image ? (
                    <MediaImage asset={p.image} aspect="4:5" sizes="(min-width: 768px) 360px, 100vw" className="h-full w-full" />
                  ) : (
                    <Image src={productPhoto.src} alt={productPhoto.alt} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover" />
                  )}
                  {p.form || p.purity ? (
                    <span className="absolute bottom-4 left-4 rounded-pill bg-white/95 px-3 py-1.5 text-xs font-bold text-primary shadow-md">
                      {[p.form, p.purity].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            {/* 07 How it is made / sourced: dark panel with a plant photo */}
            <section aria-labelledby="sourcing-title" id="sourcing" className="scroll-mt-32">
              <div data-reveal className="grid overflow-hidden rounded-[calc(var(--r-card)+8px)] bg-band text-band-ink shadow-lg md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div className="relative min-h-52">
                  <Image src={STOCK.plantPipes.src} alt="" fill sizes="(min-width: 768px) 320px, 100vw" className="object-cover" />
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-pill bg-white/92 px-3 py-1 text-xs font-bold text-primary">
                    <Factory aria-hidden="true" className="size-3.5" />
                    {p.isSourced === false ? "Made in our unit" : "From established producers"}
                  </span>
                </div>
                <div className="flex flex-col gap-4 p-7 md:p-9">
                  <Eyebrow onBand>{p.isSourced === false ? "Made by us" : "Sourcing"}</Eyebrow>
                  <h2 id="sourcing-title" className="text-h2 text-band-ink">
                    {p.isSourced === false ? "How we make it." : "Where it comes from."}
                  </h2>
                  <div className="flex flex-col gap-3 text-band-ink/80">
                    {guide.howMade.map((t) => (
                      <p key={t.slice(0, 40)}>{t}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 08 Applications by industry: photo cards */}
            <section aria-labelledby="applications-title" id="applications" className="scroll-mt-32">
              <div className="flex flex-col gap-8">
                <Heading id="applications-title" eyebrow="Applications" title={`What ${p.name} is used for.`} />
                {guide.industries.length ? (
                  <ul className="grid gap-4 sm:grid-cols-2" aria-label={`${p.name} applications by industry`}>
                    {guide.industries.map((r) => {
                      const photo = imageForText(r.industry);
                      return (
                        <li key={r.industry} data-reveal className="group flex gap-4 surface-card p-3 pr-5">
                          <span className="relative size-20 shrink-0 overflow-hidden rounded-[var(--r-card)]">
                            <Image src={photo.src} alt="" fill sizes="80px" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-110" />
                          </span>
                          <span className="flex flex-col gap-1 py-1">
                            <strong className="font-bold text-ink">{r.industry}</strong>
                            <span className="text-sm leading-relaxed text-muted">{r.use}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
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
                  <div className="flex flex-col gap-3 rounded-card bg-[color-mix(in_oklab,var(--c-primary)_5%,transparent)] p-5">
                    <h3 className="text-sm font-bold text-ink">Industries that buy it from us</h3>
                    <ul className="flex flex-wrap gap-2" aria-label="Industries">
                      {industries.map((ind) => (
                        <li key={ind.slug}>
                          <Tag href={`/industries/${ind.slug}`}>{ind.name}</Tag>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>

            {/* 09 Specifications (indicative): table card with a dark header */}
            <section aria-labelledby="specs-title" id="specifications" className="scroll-mt-32">
              <div className="flex flex-col gap-8">
                <Heading
                  id="specs-title"
                  eyebrow="Specifications"
                  title="Typical specification."
                  intro="Indicative values from recent batches. The COA supplied with your batch is the final word."
                />
                {p.specs.length ? (
                  <div data-reveal className="overflow-hidden rounded-[calc(var(--r-card)+4px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-md)]">
                    <table className="w-full text-left text-[0.9375rem]">
                      <caption className="sr-only">{p.name} specification</caption>
                      <thead className="bg-band text-band-ink">
                        <tr>
                          <th scope="col" className="px-5 py-3.5 text-xs font-bold tracking-wider uppercase">Property</th>
                          <th scope="col" className="px-5 py-3.5 text-xs font-bold tracking-wider uppercase">Typical value</th>
                          <th scope="col" className="hidden px-5 py-3.5 text-xs font-bold tracking-wider uppercase sm:table-cell">Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {p.specs.map((s) => (
                          <tr key={s.property} className="transition-colors hover:bg-[color-mix(in_oklab,var(--c-primary)_4%,transparent)]">
                            <th scope="row" className="px-5 py-3.5 font-medium text-muted">{s.property}</th>
                            <td className="px-5 py-3.5 font-bold text-ink tabular-nums">{s.value}</td>
                            <td className="hidden px-5 py-3.5 text-sm text-muted sm:table-cell">{s.method || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="flex items-center gap-2 border-t border-hairline bg-surface px-5 py-3 text-sm text-muted">
                      <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
                      Specifications are indicative. Confirm the exact values on the COA supplied with your batch.
                    </p>
                  </div>
                ) : (
                  <div data-reveal className="flex flex-col items-start gap-4 rounded-[calc(var(--r-card)+4px)] bg-card p-6 shadow-[0_0_0_1px_var(--hairline),var(--sh-md)] sm:flex-row sm:items-center">
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-card">
                      <Image src={STOCK.coa.src} alt="" fill sizes="80px" className="object-cover" />
                    </span>
                    <p className="flex-1 text-ink">
                      We send the latest COA with your quote, so you see the values of the batch you will actually
                      receive.
                    </p>
                    <Button href={quote} size="sm">
                      Ask for the COA
                    </Button>
                  </div>
                )}
              </div>
            </section>

            {/* 10 Ask the supplier: numbered question cards */}
            <section aria-labelledby="ask-title" id="ask" className="scroll-mt-32">
              <div className="flex flex-col gap-8">
                <Heading
                  id="ask-title"
                  eyebrow="Before you buy"
                  title="Questions to ask any supplier."
                  intro="Ask us these too. A good supplier answers all of them without hesitation."
                />
                <ol className="grid gap-4 sm:grid-cols-2">
                  {guide.askSupplier.map((r, i) => (
                    <li key={r.question} data-reveal className="relative flex flex-col gap-2 surface-card p-5 pt-6">
                      <span className="absolute top-5 right-5 text-[1.75rem] leading-none font-extrabold text-[color-mix(in_oklab,var(--c-accent)_45%,transparent)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <MessageCircleQuestion aria-hidden="true" className="size-6 text-primary" strokeWidth={1.75} />
                      <strong className="pr-10 font-bold text-ink">{r.question}</strong>
                      <span className="text-sm leading-relaxed text-muted">{r.why}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* 11 Packaging and storage: pack tiles, terms, storage card with a photo */}
            <section aria-labelledby="packaging-title" id="packaging" className="scroll-mt-32">
              <div className="flex flex-col gap-8">
                <Heading id="packaging-title" eyebrow="Packaging" title="Packs, minimum order and dispatch." />
                {p.packSizes.length ? (
                  <ul className="flex flex-wrap gap-3" aria-label="Pack sizes">
                    {p.packSizes.map((s) => (
                      <li key={s} data-reveal className="flex items-center gap-3 rounded-pill bg-card py-2 pr-5 pl-2 shadow-[0_0_0_1px_var(--hairline),var(--sh-sm)]">
                        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-ink">
                          <Package aria-hidden="true" className="size-4" />
                        </span>
                        <span className="font-bold text-ink">{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="grid gap-5 md:grid-cols-2">
                  <dl data-reveal className="flex flex-col divide-y divide-hairline overflow-hidden rounded-[calc(var(--r-card)+4px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-sm)]">
                    {[
                      [Boxes, "Minimum order", p.moq || "On request"],
                      [Truck, "Dispatch", p.dispatchTime || "Usually within 7 working days"],
                      [Tags, "Labelling", "Product name and batch number on every pack"],
                      [CalendarClock, "Shelf life", p.shelfLife || "As per the producer's COA"],
                    ].map(([Icon, k, v]) => (
                      <div key={k} className="flex items-start gap-3 px-5 py-4">
                        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
                        <span className="flex flex-col">
                          <dt className="text-sm font-bold text-ink">{k}</dt>
                          <dd className="text-sm text-muted">{v}</dd>
                        </span>
                      </div>
                    ))}
                  </dl>
                  <div data-reveal className="relative isolate flex flex-col justify-end gap-3 overflow-hidden rounded-[calc(var(--r-card)+4px)] p-6 text-white shadow-md">
                    <Image src={STOCK.ibcStore.src} alt="" fill sizes="(min-width: 768px) 380px, 100vw" className="-z-20 object-cover" />
                    <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(0_0_0/0.1),color-mix(in_oklab,var(--c-band)_94%,black)_75%)]" />
                    <h3 className="text-h3 text-white">Storage and handling</h3>
                    {guide.storage.map((t) => (
                      <p key={t.slice(0, 40)} className="text-sm leading-relaxed text-white/85">
                        {t}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 12 Documents: dark panel with document tiles */}
            <section aria-labelledby="documents-title" id="documents" className="scroll-mt-32">
              <div data-reveal className="flex flex-col gap-6 rounded-[calc(var(--r-card)+8px)] bg-band bg-[radial-gradient(70%_90%_at_100%_0%,color-mix(in_oklab,var(--c-accent)_22%,transparent),transparent_60%)] p-7 text-band-ink shadow-lg md:p-9">
                <div className="flex flex-col gap-3">
                  <Eyebrow onBand>Documents</Eyebrow>
                  <h2 id="documents-title" className="text-h2 text-band-ink">
                    COA, SDS and technical data.
                  </h2>
                  <p className="text-band-ink/75">
                    Public documents download straight away. Batch documents are sent with your quote or invoice.
                  </p>
                </div>
                <ul className="grid gap-3 md:grid-cols-2" data-testid="documents">
                  {[
                    ...p.documents.map((d) =>
                      d.isPublic
                        ? { key: d.id, href: `/d/${d.media.id}`, rel: "nofollow", icon: Download, name: d.label || DOC_NAMES[d.type], note: `PDF · ${formatBytes(d.media.bytes)}` }
                        : { key: d.id, href: `/contact?product=${encodeURIComponent(p.slug)}&doc=${d.type}#quote`, icon: FileLock2, name: d.label || DOC_NAMES[d.type], note: "Sent on request with your enquiry" },
                    ),
                    ...(!p.documents.some((d) => d.type === "COA")
                      ? [{ key: "coa", href: `/contact?product=${encodeURIComponent(p.slug)}&doc=COA#quote`, icon: FileLock2, name: "Certificate of Analysis (COA)", note: "Batch COA sent with your quote" }]
                      : []),
                    ...(!p.documents.some((d) => d.type === "SDS")
                      ? [{ key: "sds", href: `/contact?product=${encodeURIComponent(p.slug)}&doc=SDS#quote`, icon: FileLock2, name: "Safety Data Sheet (SDS)", note: "Sent on request" }]
                      : []),
                  ].map((d) => (
                    <li key={d.key}>
                      <a
                        href={d.href}
                        rel={d.rel}
                        className="group flex items-center gap-4 rounded-card bg-white/[0.07] px-4 py-3.5 ring-1 ring-white/15 transition-colors hover:bg-white/[0.13]"
                      >
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--c-accent)_22%,transparent)] text-accent ring-1 ring-[color-mix(in_oklab,var(--c-accent)_40%,transparent)]">
                          <d.icon aria-hidden="true" className="size-5" />
                        </span>
                        <span className="flex flex-1 flex-col">
                          <span className="font-semibold text-band-ink">{d.name}</span>
                          <span className="text-[0.8125rem] text-band-ink/65">{d.note}</span>
                        </span>
                        <ArrowRight aria-hidden="true" className="size-4 text-band-ink/60 transition-transform group-hover:translate-x-1" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 13 Supply and pricing factors: icon cards */}
            <section aria-labelledby="pricing-title" id="pricing" className="scroll-mt-32">
              <div className="flex flex-col gap-8">
                <Heading
                  id="pricing-title"
                  eyebrow="Supply and price"
                  title="What decides the price."
                  intro="We quote in writing, per kg or per litre, with GST and freight shown separately."
                />
                {p.showPrice && p.indicativePrice ? (
                  <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-card bg-[color-mix(in_oklab,var(--c-accent)_12%,var(--c-card))] px-5 py-4 shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-accent)_35%,transparent)]">
                    <span className="text-lg font-extrabold text-ink">Indicative price: {p.indicativePrice}</span>
                    <span className="text-sm text-muted">
                      For guidance only; your quote depends on grade, quantity and delivery city.
                    </span>
                  </p>
                ) : null}
                <ul className="grid gap-4 sm:grid-cols-2">
                  {guide.pricingFactors.map((r, i) => {
                    const Icon = PRICE_ICONS[i % PRICE_ICONS.length];
                    return (
                      <li key={r.factor} data-reveal className="flex gap-4 surface-card p-5">
                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[calc(var(--r-btn)+2px)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--c-primary)_80%,white),var(--c-primary))] text-primary-ink shadow-primary">
                          <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                        </span>
                        <span className="flex flex-col gap-1">
                          <strong className="font-bold text-ink">{r.factor}</strong>
                          <span className="text-sm leading-relaxed text-muted">{r.effect}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            {/* 14 FAQs with FAQ schema */}
            {p.faqs.length ? (
              <section aria-labelledby="faqs-title" id="faqs" className="scroll-mt-32">
                <div className="flex flex-col gap-8">
                  <Heading id="faqs-title" eyebrow="FAQs" title={`${p.name}: questions buyers ask.`} />
                  <Accordion items={p.faqs.map((f, n) => ({ id: `q${n}`, title: f.q, content: f.a }))} />
                  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
                </div>
              </section>
            ) : null}
          </div>

          {/* Sticky quote card */}
          <aside className="lg:sticky lg:top-32 lg:self-start" aria-label="Quote summary">
            <div className="flex flex-col overflow-hidden rounded-[calc(var(--r-card)+8px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-lg)]">
              <div className="relative h-36 overflow-hidden">
                {p.image ? (
                  <MediaImage asset={p.image} aspect="16:9" sizes="380px" className="h-full w-full" />
                ) : (
                  <Image src={productPhoto.src} alt="" fill sizes="380px" className="object-cover" />
                )}
                <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,color-mix(in_oklab,var(--c-band)_88%,transparent))]" />
                <p className="absolute right-5 bottom-4 left-5 text-lg leading-snug font-bold text-white">{p.name}</p>
              </div>
              <dl className="flex flex-col divide-y divide-hairline px-5">
                {[
                  ["CAS", p.casNo],
                  ["Grade", [p.grade, p.purity].filter(Boolean).join(" · ")],
                  ["Packs", p.packSizes.slice(0, 3).join(", ")],
                  ["MOQ", p.moq],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="text-sm text-muted">{k}</dt>
                      <dd className="text-right text-sm font-bold text-ink tabular-nums">{v}</dd>
                    </div>
                  ))}
              </dl>
              <div className="flex flex-col gap-2.5 p-5 pt-3 [&_a]:w-full [&_button]:w-full">
                <Button href={quote} size="lg">
                  Request quotation <ArrowRight aria-hidden="true" />
                </Button>
                <AddToQuote slug={p.slug} />
                {chrome.contact.phone ? (
                  <a
                    href={chrome.contact.phoneHref}
                    className="inline-flex items-center justify-center gap-2 py-2 text-sm font-bold text-primary hover:underline"
                  >
                    <Phone aria-hidden="true" className="size-4" /> Call {chrome.contact.phone}
                  </a>
                ) : null}
              </div>
              <ul className="flex flex-col gap-2 border-t border-hairline bg-surface px-5 py-4 text-sm text-ink">
                {["COA with every batch", "GST invoice on every consignment", "Dispatch across India"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </Container>
      </div>

      {/* 15 Related products: carousel */}
      {p.related.length ? (
        <section className="bg-surface py-14 md:py-20" aria-labelledby="related-title">
          <Container>
            <Carousel
              label="Related products"
              heading={<Heading id="related-title" eyebrow="Related" title="Buyers also ask about." />}
              action={
                <Button href={`/products/${p.category.slug}`} variant="link" className="mr-2 hidden sm:inline-flex">
                  All {p.category.name} <ArrowRight aria-hidden="true" />
                </Button>
              }
            >
              {p.related.map((r) => (
                <li key={r.id} className="w-[17.5rem] shrink-0 snap-start">
                  <ProductCard product={r} />
                </li>
              ))}
            </Carousel>
          </Container>
        </section>
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
