import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CtaBand, Faq } from "@/components/sections/ContentSections";
import { ProductCard } from "@/components/site/ProductCard";
import { SimpleHero } from "@/components/site/SimpleHero";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Layout";
import { IconBox } from "@/components/ui/Static";
import { getIndustries, getIndustryPage } from "@/lib/content/data";
import { iconFor } from "@/lib/sections/icons";
import { SECTIONS } from "@/lib/sections/registry";
import { getSiteChrome } from "@/lib/site-chrome";
import { SLUG_RE } from "@/lib/validation/catalogue";

/** Industry page (Phase 15 todos 02, 19): what buyers in this industry need, the products they use, FAQs. */
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const list = await getIndustries();
  return (list.length ? list.map((i) => i.slug) : ["food-beverage"]).map((industry) => ({ industry }));
}

export async function generateMetadata({ params }) {
  const { industry } = await params;
  if (!SLUG_RE.test(industry)) return {};
  const ind = await getIndustryPage(industry);
  if (!ind) return {};
  const seo = ind.seo ?? {};
  return {
    title: seo.title ? { absolute: seo.title } : `Raw Materials for ${ind.name}`,
    description: seo.description || ind.summary,
    alternates: { canonical: `/industries/${ind.slug}` },
    ...(seo.noindex ? { robots: { index: false } } : {}),
  };
}

export default async function IndustryPage({ params }) {
  const { industry } = await params;
  if (!SLUG_RE.test(industry)) notFound();
  const ind = await getIndustryPage(industry);
  if (!ind) notFound();
  const chrome = await getSiteChrome();

  return (
    <>
      <SimpleHero
        crumbs={[{ label: "Industries", href: "/industries" }, { label: ind.name }]}
        eyebrow="Industry"
        title={`Raw materials for ${ind.name.toLowerCase()}.`}
        intro={ind.content.intro || ind.summary}
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/contact#quote">
            Request a quote <ArrowRight aria-hidden="true" />
          </Button>
          <Button href="#products" variant="secondary">
            See the {ind.products.length} products
          </Button>
        </div>
      </SimpleHero>

      {ind.content.needs.length ? (
        <Section aria-labelledby="needs-title">
          <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
            <div className="flex flex-col gap-3">
              <IconBox icon={iconFor(ind.icon)} />
              <Eyebrow>What buyers need</Eyebrow>
              <h2 id="needs-title" className="text-h2">
                What {ind.name.toLowerCase()} buyers ask us for.
              </h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {ind.content.needs.map((n) => (
                <li key={n.title} className="flex gap-3 surface-card p-5">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />
                  <span className="flex flex-col gap-1">
                    <strong className="font-semibold text-ink">{n.title}</strong>
                    <span className="text-[0.9375rem] text-muted">{n.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <Section tone="surface" aria-labelledby="products-title" id="products" className="scroll-mt-24">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Eyebrow>Products</Eyebrow>
            <h2 id="products-title" className="text-h2">
              Products {ind.name.toLowerCase()} makers buy from us.
            </h2>
          </div>
          {ind.products.length ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {ind.products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Tell us what you make and we will suggest the right materials.</p>
          )}
        </Container>
      </Section>

      {ind.faqs.length ? (
        <Faq
          tone="white"
          data={{
            eyebrow: "Questions",
            title: `${ind.name}: questions buyers ask.`,
            intro: "",
            items: ind.faqs,
          }}
        />
      ) : null}

      {ind.others.length ? (
        <Section tone={ind.faqs.length ? "surface" : "white"} aria-labelledby="others-title">
          <Container className="flex flex-col gap-6">
            <h2 id="others-title" className="text-h3">
              Other industries we supply
            </h2>
            <ul className="flex flex-wrap gap-2">
              {ind.others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/industries/${o.slug}`}
                    className="inline-flex h-10 items-center rounded-btn border border-line bg-card px-4 text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
                  >
                    {o.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <CtaBand data={SECTIONS.ctaBand.defaults} ctx={{ contact: chrome.contact }} />
    </>
  );
}
