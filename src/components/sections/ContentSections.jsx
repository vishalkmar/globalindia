import { ArrowRight, Boxes, CalendarDays, FileCheck2, FlaskConical, Handshake, MapPin, Package, Phone, Quote, Users } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { MediaImage } from "@/components/ui/MediaImage";
import { CountUp } from "@/components/ui/Motion";
import Link from "@/components/ui/SmartLink";
import { IconBox } from "@/components/ui/Static";
import { Accordion } from "@/components/ui/Tabs";
import { familyByKey } from "@/lib/catalogue/families";
import { getCatalogueTotals, getFamilyCounts } from "@/lib/sections/data";
import { iconFor } from "@/lib/sections/icons";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getMedia } from "@/lib/site-data";
import { FAMILY_IMAGE, imageForText, STOCK } from "@/lib/stockImages";
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
  // Straight after the hero the strip rises over the hero's bottom edge (one joined panel).
  const overlap = ctx.prev === "hero" && !data.title;
  return (
    <Section tone={tone} className={overlap ? "pt-0! pb-12 md:pb-16" : undefined}>
      <Container className="flex flex-col gap-10">
        {/* Without a visible title, keep the outline correct (H1 -> H2 -> H3) for screen readers. */}
        {data.title ? (
          <Heading d={data} />
        ) : (
          <h2 className="sr-only">Why buyers choose {ctx.business.name}</h2>
        )}
        <div
          className={cn(
            "grid overflow-hidden rounded-[calc(var(--r-card)+4px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-lg)]",
            data.items.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3",
            overlap && "relative z-10 -mt-14 md:-mt-20",
          )}
        >
          {data.items.map((item, i) => (
            <div
              key={item.title}
              className={cn(
                "group flex gap-4 p-6 md:p-7",
                i > 0 && "border-t border-hairline md:border-t-0 md:border-l",
              )}
            >
              <IconBox icon={iconFor(item.icon)} />
              <div className="flex flex-col gap-1.5">
                <h3 className="text-h4 text-ink">{item.title}</h3>
                {item.text ? <p className="text-[0.9375rem] leading-relaxed text-muted">{item.text}</p> : null}
              </div>
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
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        {/* Photo collage: uploaded photo (or warehouse) large, lab photo inset, quote card on top. */}
        <div data-reveal className="relative sm:pr-16 sm:pb-16 lg:order-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--r-card)+6px)] shadow-lg">
            {image ? (
              <MediaImage asset={image} aspect="4:3" sizes="(min-width: 1024px) 560px, 100vw" className="h-full w-full" />
            ) : (
              <Image
                src={STOCK.warehouseFloor.src}
                alt={STOCK.warehouseFloor.alt}
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover"
              />
            )}
          </div>
          <div
            aria-hidden="true"
            className="absolute right-0 bottom-24 hidden aspect-square w-40 overflow-hidden rounded-card shadow-lg ring-[6px] ring-[var(--c-bg)] sm:block"
          >
            <Image src={STOCK.labMicroscope.src} alt="" fill sizes="160px" className="object-cover" />
          </div>
          {data.quote ? (
            <figure className="relative mx-4 -mt-12 max-w-sm rounded-card bg-band p-5 text-band-ink shadow-lg sm:absolute sm:bottom-0 sm:left-8 sm:mx-0 sm:mt-0">
              <Quote aria-hidden="true" className="mb-2 size-5 text-accent" strokeWidth={2} />
              <blockquote className="text-[1.0625rem] leading-snug font-semibold">{data.quote}</blockquote>
              {data.quoteAuthor ? (
                <figcaption className="mt-3 text-sm text-[color-mix(in_oklab,var(--c-band-ink)_70%,transparent)]">
                  <span className="font-bold text-band-ink">{data.quoteAuthor}</span>
                  {data.quoteRole ? `, ${data.quoteRole}` : ""}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-5 lg:order-1">
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          <h2 className="text-h2">{data.title}</h2>
          {data.text ? <p className="measure text-body text-muted">{data.text}</p> : null}
          <LinkButton cta={data.cta} variant="primary" />
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
          {data.items.map((item) => {
            const fam = familyByKey(item.family);
            if (!fam) return null;
            const count = counts[item.family] ?? 0;
            const photo = FAMILY_IMAGE[item.family] ?? STOCK.labPipette;
            return (
              <li data-reveal key={item.family}>
                <Link
                  href={`/products?family=${fam.slug}`}
                  className="group relative isolate flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-[calc(var(--r-card)+4px)] p-6 text-white shadow-md transition-shadow duration-300 hover:shadow-lg"
                >
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className="-z-20 object-cover transition-transform duration-700 ease-[var(--ease-standard)] motion-safe:group-hover:scale-105"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(0_0_0/0.05)_0%,rgb(0_0_0/0.25)_40%,color-mix(in_oklab,var(--c-band)_94%,black)_100%)]"
                  />
                  {data.showCounts && count > 0 ? (
                    <span className="absolute top-4 right-4 rounded-pill bg-white/90 px-3 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur">
                      {count} products
                    </span>
                  ) : null}
                  <span className="absolute top-4 left-4 inline-flex size-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur">
                    {(() => {
                      const Icon = iconFor(fam.icon);
                      return <Icon aria-hidden="true" className="size-5 text-white" strokeWidth={1.75} />;
                    })()}
                  </span>
                  <h3 className="text-h3 text-white">{item.title}</h3>
                  {item.text ? (
                    <p className="mt-2 line-clamp-2 text-[0.9375rem] leading-relaxed text-white/80">{item.text}</p>
                  ) : null}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-white">
                    See the range
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-white text-primary transition-transform duration-300 group-hover:translate-x-1">
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </span>
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
          {data.items.map((item) => {
            const photo = imageForText(item.title);
            const Icon = iconFor(item.icon);
            const Inner = (
              <>
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-standard)] motion-safe:group-hover:scale-105"
                  />
                  <span className="absolute bottom-0 left-4 inline-flex size-10 translate-y-1/2 items-center justify-center rounded-full bg-card text-primary shadow-md">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4 pt-7">
                  <h3 className="text-h4 text-ink">{item.title}</h3>
                  {item.text ? (
                    <p className="line-clamp-3 text-[0.875rem] leading-relaxed text-muted">{item.text}</p>
                  ) : null}
                </div>
              </>
            );
            const cls = "group flex h-full flex-col overflow-hidden surface-card";
            return (
              <li data-reveal key={item.title}>
                {item.href ? (
                  <Link href={item.href} className={cn(cls, "lift")}>
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

const VALUE_ICONS = [FlaskConical, Boxes, FileCheck2, Handshake];
const STAT_ICONS = { years: CalendarDays, products: Package, categories: Boxes, team: Users };

/* 08 — numbered values 01-04 */
export function NumberedValues({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
        <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <Heading d={data} />
          <span aria-hidden="true" className="h-1 w-16 rounded-pill bg-[linear-gradient(90deg,var(--c-accent),transparent)]" />
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-[calc(var(--r-card)+6px)] shadow-lg lg:block">
            <Image src={STOCK.labFlasks.src} alt={STOCK.labFlasks.alt} fill sizes="400px" className="object-cover" />
          </div>
        </div>
        {/* Timeline: a soft vertical rail with a dot per promise, each promise a card with an icon tile. */}
        <ol className="relative flex flex-col gap-4 pl-8 before:absolute before:top-6 before:bottom-6 before:left-[0.6875rem] before:w-0.5 before:rounded-pill before:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--c-primary)_45%,transparent),color-mix(in_oklab,var(--c-accent)_55%,transparent))] md:pl-10">
          {data.items.map((item, i) => {
            const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
            return (
              <li data-reveal key={item.title} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 -left-8 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-bg ring-2 ring-primary md:-left-10"
                >
                  <span className="size-2 rounded-full bg-primary" />
                </span>
                <div className="group relative flex items-start gap-5 overflow-hidden surface-card p-5 transition-[box-shadow,transform] duration-300 hover:shadow-lg motion-safe:hover:translate-x-1 md:p-6">
                  <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-[calc(var(--r-btn)+4px)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--c-primary)_80%,white),var(--c-primary))] text-primary-ink shadow-primary">
                    <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-1 flex-col gap-1.5 pr-12">
                    <h3 className="text-h3">{item.title}</h3>
                    {item.text ? <p className="text-[0.9375rem] leading-relaxed text-muted">{item.text}</p> : null}
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute top-4 right-5 text-[2.75rem] leading-none font-extrabold tracking-tight text-[color-mix(in_oklab,var(--c-primary)_10%,transparent)] select-none"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </li>
            );
          })}
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
  // Straight after a dark band or a page header the numbers become a white card that rises over it.
  if (ctx.prev === "iconCards" || ctx.prev === "pageHero") {
    return (
      <section aria-label="Global India in numbers" className="relative z-10 bg-bg pb-4">
        <Container>
          <div
            data-reveal
            className="-mt-12 grid grid-cols-2 overflow-hidden rounded-[calc(var(--r-card)+6px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-lg)] md:-mt-14 md:grid-cols-4"
          >
            {data.items.map((s, i) => {
              const live = s.source !== "manual" && auto[s.source] > 0 ? auto[s.source] : s.value;
              const Icon = STAT_ICONS[s.source] ?? MapPin;
              return (
                <div
                  key={s.label}
                  className={cn(
                    "flex items-center gap-4 p-5 md:p-7",
                    i % 2 === 1 && "border-l border-hairline",
                    i >= 2 && "border-t border-hairline md:border-t-0",
                    i === 2 && "md:border-l",
                  )}
                >
                  <span className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--c-primary)_9%,transparent)] text-primary sm:inline-flex">
                    <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <CountUp
                      value={live}
                      suffix={s.suffix}
                      group={s.source !== "years"}
                      className="text-[2rem] leading-none font-extrabold tracking-tight text-primary md:text-[2.5rem]"
                    />
                    <span className="text-sm font-medium text-muted">{s.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    );
  }
  return (
    <section
      className="relative isolate overflow-hidden bg-band py-14 text-band-ink md:py-20"
      aria-label="Global India in numbers"
    >
      <Image src={STOCK.trucks.src} alt="" fill sizes="100vw" className="-z-20 object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[color-mix(in_oklab,var(--c-band)_88%,transparent)]" />
      <Container>
        <div data-reveal className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {data.items.map((s, i) => {
            const live = s.source !== "manual" && auto[s.source] > 0 ? auto[s.source] : s.value;
            return (
              <div
                key={s.label}
                className={cn(
                  "flex flex-col gap-2 px-2 md:px-8",
                  i > 0 && "md:border-l md:border-white/15",
                  i % 2 === 1 && "border-l border-white/15",
                )}
              >
                <CountUp
                  value={live}
                  suffix={s.suffix}
                  group={s.source !== "years"}
                  className="font-display text-[2.75rem] leading-none font-extrabold tracking-tight text-band-ink md:text-[3.5rem]"
                />
                <span className="h-0.5 w-8 rounded-pill bg-accent" aria-hidden="true" />
                <span className="text-sm font-medium text-[color-mix(in_oklab,var(--c-band-ink)_72%,transparent)]">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
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
            <li data-reveal key={step.title} className="relative flex flex-col gap-3 surface-card p-6">
              <div className="flex items-center justify-between gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-ink shadow-primary ring-4 ring-[color-mix(in_oklab,var(--c-primary)_10%,transparent)]"
                >
                  {i + 1}
                </span>
                <span aria-hidden="true" className="text-xs font-bold tracking-widest text-muted uppercase">
                  Step {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="text-h3">{step.title}</h3>
              {step.text ? <p className="text-[0.9375rem] leading-relaxed text-muted">{step.text}</p> : null}
              {i < data.steps.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="absolute top-1/2 -right-[1.1rem] z-10 hidden size-5 -translate-y-1/2 rounded-full bg-card p-0.5 text-accent shadow-sm lg:block"
                />
              ) : null}
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
        <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <Heading d={data} />
          <div className="relative hidden aspect-[16/10] overflow-hidden rounded-[calc(var(--r-card)+6px)] shadow-md lg:block">
            <Image src={STOCK.labPipette.src} alt={STOCK.labPipette.alt} fill sizes="440px" className="object-cover" />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,color-mix(in_oklab,var(--c-band)_70%,transparent))]"
            />
            <Link
              href="/contact#contact"
              className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-pill bg-white/95 px-4 py-2 text-sm font-bold text-primary shadow-md hover:bg-white"
            >
              Still have a question? Ask us <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
        <Accordion items={data.items.map((i, n) => ({ id: `q${n}`, title: i.q, content: i.a }))} />
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </Section>
  );
}

/* 15 — closing call to action */
export function CtaBand({ data, ctx }) {
  return (
    <Section tone="white">
      <Container>
        {/* Split panel: copy and actions on the dark side, a warehouse photo on the right with a soft diagonal edge. */}
        <div
          data-reveal
          className="relative isolate grid overflow-hidden rounded-[calc(var(--r-card)+8px)] bg-band text-band-ink shadow-lg lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_90%_at_0%_100%,color-mix(in_oklab,var(--c-accent)_22%,transparent),transparent_60%)]"
          />
          <div className="flex flex-col items-start gap-5 p-8 md:p-12 lg:p-14">
            {data.eyebrow ? <Eyebrow onBand>{data.eyebrow}</Eyebrow> : null}
            <h2 className="max-w-xl text-h2 text-band-ink">{data.title}</h2>
            {data.text ? <p className="text-band-ink/80">{data.text}</p> : null}
            <div className="flex flex-wrap gap-3 pt-2">
              {data.cta?.text && data.cta?.href ? (
                <Button href={data.cta.href} variant="onBand" size="lg">
                  {data.cta.text} <ArrowRight aria-hidden="true" />
                </Button>
              ) : null}
              {data.showPhone && ctx.contact.phone ? (
                <Button href={ctx.contact.phoneHref} variant="onBandOutline" size="lg">
                  <Phone aria-hidden="true" /> {ctx.contact.phone}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="relative min-h-56 lg:min-h-full lg:[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]">
            <Image
              src={STOCK.warehousePallets.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
