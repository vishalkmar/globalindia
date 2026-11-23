import { ArrowRight, Phone, Quote } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { MediaImage } from "@/components/ui/MediaImage";
import { CountUp } from "@/components/ui/Motion";
import { IconBox } from "@/components/ui/Static";
import { Accordion } from "@/components/ui/Tabs";
import { familyByKey } from "@/lib/catalogue/families";
import { getCatalogueTotals, getFamilyCounts } from "@/lib/sections/data";
import { iconFor } from "@/lib/sections/icons";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getMedia } from "@/lib/site-data";
import { cn } from "@/lib/utils";

const hasHeading = (d) => d.eyebrow || d.title || d.intro;
const Heading = ({ d, align }) =>
  hasHeading(d) ? <SectionHeading eyebrow={d.eyebrow} title={d.title} intro={d.intro} align={align} /> : null;
const LinkButton = ({ cta, variant = "secondary" }) =>
  cta?.text && cta?.href ? (
    <Button href={cta.href} variant={variant}>
      {cta.text} <ArrowRight aria-hidden="true" />
    </Button>
  ) : null;

/* 03 — three reasons */
export function FeatureTriad({ data, tone, ctx }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        {/* Without a visible title, keep the outline correct (H1 -> H2 -> H3) for screen readers. */}
        {data.title ? (
          <Heading d={data} />
        ) : (
          <h2 className="sr-only">Why buyers choose {ctx.business.name}</h2>
        )}
        <div
          className={cn(
            "grid gap-6",
            data.items.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3",
          )}
        >
          {data.items.map((item, i) => (
            <div
              data-reveal
              key={item.title}
              className="flex flex-col gap-4 surface-card p-6 md:p-8"
            >
              <IconBox icon={iconFor(item.icon)} />
              <h3 className="text-h3">{item.title}</h3>
              {item.text ? <p className="text-muted">{item.text}</p> : null}
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* 04 — about teaser with pull quote */
export async function AboutTeaser({ data, tone }) {
  const image = data.imageId ? await getMedia(data.imageId) : null;
  return (
    <Section tone={tone}>
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          <h2 className="text-h2">{data.title}</h2>
          {data.text ? <p className="measure text-body text-muted">{data.text}</p> : null}
          <LinkButton cta={data.cta} />
        </div>
        <div className="flex flex-col gap-6">
          {image ? (
            <MediaImage
              asset={image}
              aspect="4:3"
              sizes="(min-width: 1024px) 480px, 100vw"
              className="w-full surface-card"
            />
          ) : null}
          {data.quote ? (
            <figure className="flex flex-col gap-4 border-l-2 border-accent pl-6">
              <Quote aria-hidden="true" className="size-6 text-accent" strokeWidth={1.5} />
              <blockquote className="font-display text-[1.5rem] leading-snug text-primary">
                {data.quote}
              </blockquote>
              {data.quoteAuthor ? (
                <figcaption className="text-small text-muted">
                  <span className="font-semibold text-ink">{data.quoteAuthor}</span>
                  {data.quoteRole ? `, ${data.quoteRole}` : ""}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}

/* 05 — product families with live counts */
export async function ProductFamilies({ data, tone }) {
  const counts = data.showCounts ? await getFamilyCounts() : {};
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item, i) => {
            const fam = familyByKey(item.family);
            if (!fam) return null;
            const count = counts[item.family] ?? 0;
            return (
              <li data-reveal key={item.family}>
                <Link
                  href={`/products?family=${fam.slug}`}
                  className="lift group flex h-full flex-col gap-4 surface-card p-6 duration-150 motion-reduce:hover:translate-y-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <IconBox icon={iconFor(fam.icon)} />
                    {data.showCounts && count > 0 ? (
                      <span className="font-data text-[0.8125rem] text-muted">{count} products</span>
                    ) : null}
                  </div>
                  <h3 className="text-h3">{item.title}</h3>
                  {item.text ? <p className="text-[0.9375rem] text-muted">{item.text}</p> : null}
                  <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    See the range{" "}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

/* 07 — industries */
export function Industries({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((item, i) => {
            const Inner = (
              <>
                <IconBox icon={iconFor(item.icon)} />
                <h3 className="text-h4 text-primary">{item.title}</h3>
                {item.text ? <p className="text-[0.875rem] leading-relaxed text-muted">{item.text}</p> : null}
              </>
            );
            const cls = "flex h-full flex-col gap-3 surface-card p-5";
            return (
              <li data-reveal key={item.title}>
                {item.href ? (
                  <Link href={item.href} className={cn(cls, "transition-colors hover:border-primary")}>
                    {Inner}
                  </Link>
                ) : (
                  <div className={cls}>{Inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

/* 08 — numbered values 01-04 */
export function NumberedValues({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Heading d={data} />
        </div>
        <ol className="flex flex-col divide-y divide-line border-y border-line">
          {data.items.map((item, i) => (
            <li
              data-reveal
              key={item.title}
              className="grid grid-cols-[3.5rem_1fr] gap-4 py-6 md:grid-cols-[4.5rem_1fr]"
            >
              <span
                aria-hidden="true"
                className="font-display text-[2rem] leading-none text-accent-text md:text-[2.5rem]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-h3">{item.title}</h3>
                {item.text ? <p className="text-muted">{item.text}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/* 09 — numbers strip: real values from data, typed value until data exists */
export async function Stats({ data, ctx }) {
  const totals = await getCatalogueTotals();
  const auto = {
    years: ctx.year - ctx.business.established,
    products: totals.products,
    categories: totals.categories,
    team: ctx.business.teamSize,
  };
  return (
    <section className="border-y border-line bg-bg" aria-label="Global India in numbers">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-8 py-12 md:grid-cols-4 md:py-14">
        {data.items.map((s) => {
          const live = s.source !== "manual" && auto[s.source] > 0 ? auto[s.source] : s.value;
          return (
            <div key={s.label} className="flex flex-col gap-1.5 border-l border-accent pl-4">
              <CountUp
                value={live}
                suffix={s.suffix}
                group={s.source !== "years"}
                className="font-display text-[2.25rem] leading-none text-accent-text md:text-[2.75rem]"
              />
              <span className="text-small text-muted">{s.label}</span>
            </div>
          );
        })}
      </Container>
    </section>
  );
}

/* 10 — how ordering works */
export function Process({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        <ol
          className={cn(
            "grid gap-6",
            data.steps.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3",
          )}
        >
          {data.steps.map((step, i) => (
            <li data-reveal key={step.title} className="relative flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-btn border border-primary font-data text-sm font-semibold text-primary"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < data.steps.length - 1 ? (
                  <span aria-hidden="true" className="hidden h-px flex-1 bg-line lg:block" />
                ) : null}
              </div>
              <h3 className="text-h3">{step.title}</h3>
              {step.text ? <p className="text-muted">{step.text}</p> : null}
            </li>
          ))}
        </ol>
        {data.cta?.text && data.cta?.href ? (
          <div>
            <Button href={data.cta.href}>
              {data.cta.text} <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}

/* 14 — FAQ with FAQPage structured data */
export function Faq({ data, tone }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
  return (
    <Section tone={tone}>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <Heading d={data} />
        <Accordion items={data.items.map((i, n) => ({ id: `q${n}`, title: i.q, content: i.a }))} />
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </Section>
  );
}

/* 15 — closing call to action */
export function CtaBand({ data, ctx }) {
  return (
    <Section tone="band">
      <Container className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-4">
          {data.eyebrow ? <Eyebrow onBand>{data.eyebrow}</Eyebrow> : null}
          <h2 className="text-h2">{data.title}</h2>
          {data.text ? <p className="text-band-ink/80">{data.text}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {data.cta?.text && data.cta?.href ? (
            <Button href={data.cta.href} variant="onBand" size="lg">
              {data.cta.text}
            </Button>
          ) : null}
          {data.showPhone && ctx.contact.phone ? (
            <Button href={ctx.contact.phoneHref} variant="onBandOutline" size="lg">
              <Phone aria-hidden="true" /> {ctx.contact.phone}
            </Button>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
