import { ArrowRight, Check, FileDown, ImageIcon, Mail, MapPin, Phone } from "lucide-react";

import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { MediaImage } from "@/components/ui/MediaImage";
import { IconBox } from "@/components/ui/Static";
import { getGalleryItems } from "@/lib/sections/data";
import { iconFor } from "@/lib/sections/icons";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { getMedia } from "@/lib/site-data";
import { cn, formatBytes } from "@/lib/utils";

import { GalleryGrid } from "./GalleryGrid";

const Heading = ({ d }) =>
  d.eyebrow || d.title || d.intro ? (
    <SectionHeading eyebrow={d.eyebrow} title={d.title} intro={d.intro} />
  ) : null;
const CtaButton = ({ cta, variant = "primary" }) =>
  cta?.text && cta?.href ? (
    <Button href={cta.href} variant={variant}>
      {cta.text} <ArrowRight aria-hidden="true" />
    </Button>
  ) : null;

/* Page header with breadcrumb (todo 01) */
export async function PageHero({ data, ctx }) {
  const image = data.imageId ? await getMedia(data.imageId) : null;
  return (
    <section className="hero-backdrop relative isolate overflow-hidden bg-surface" aria-labelledby="page-title">
      <Container
        className={cn(
          "grid gap-10 py-12 md:py-16",
          image && "items-center lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]",
        )}
      >
        <div className="flex flex-col items-start gap-5">
          <Breadcrumb items={[{ label: ctx.page.title }]} />
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          <h1 id="page-title" className="measure text-display">
            {data.title}
          </h1>
          {data.intro ? <p className="measure text-lead">{data.intro}</p> : null}
        </div>
        {image ? (
          <MediaImage
            asset={image}
            aspect="4:3"
            priority
            sizes="(min-width: 1024px) 480px, 100vw"
            className="w-full surface-card"
          />
        ) : null}
      </Container>
    </section>
  );
}

/* Rich text (todo 02): sanitised on save AND again here before rendering */
export function RichText({ data, tone }) {
  const html = sanitizeRichText(data.body);
  return (
    <Section tone={tone}>
      <Container
        className={cn("grid gap-10", data.aside && "lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-16")}
      >
        <div className="flex flex-col gap-5">
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          {data.title ? <h2 className="text-h2">{data.title}</h2> : null}
          <div className="prose-site measure text-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        {data.aside ? (
          <aside className="self-start border-l-2 border-accent bg-card p-6 text-ink">
            <p className="font-display text-xl leading-snug text-primary">{data.aside}</p>
          </aside>
        ) : null}
      </Container>
    </Section>
  );
}

/* Timeline (todo 03) */
export function Timeline({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        <ol className="relative flex flex-col gap-8 border-l border-line pl-8 md:pl-10">
          {data.items.map((m) => (
            <li key={`${m.year}-${m.title}`} data-reveal className="relative">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-[37px] size-3 rounded-full border-2 border-accent bg-bg md:-left-[45px]"
              />
              <p className="font-data text-sm font-semibold text-accent-text">{m.year}</p>
              <h3 className="mt-1 text-h3">{m.title}</h3>
              {m.text ? <p className="mt-1.5 measure text-muted">{m.text}</p> : null}
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/* Key facts table (todo 04): business facts come from Settings > Business details */
export function FactsTable({ data, tone, ctx }) {
  const b = ctx.business;
  const auto = data.useBusiness
    ? [
        ["Nature of business", b.natureOfBusiness],
        ["Proprietor", b.proprietor],
        ["Year established", String(b.established)],
        ["Team", b.teamSize ? `${b.teamSize} people` : ""],
        ["Banker", b.banker],
        ["GSTIN", b.gst],
        ["Market", b.market],
        [
          "Address",
          [b.address.line1, b.address.line2, `${b.address.city} ${b.address.pin}`].filter(Boolean).join(", "),
        ],
      ].filter(([, v]) => v)
    : [];
  const rows = [...auto, ...data.rows.map((r) => [r.label, r.value])];
  return (
    <Section tone={tone}>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
        <Heading d={data} />
        <div className="flex flex-col gap-3">
          <dl className="divide-y divide-line overflow-hidden surface-card">
            {rows.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-6">
                <dt className="text-small text-muted">{k}</dt>
                <dd className={cn("text-ink", k === "GSTIN" && "font-data")}>{v}</dd>
              </div>
            ))}
          </dl>
          {data.note ? <p className="text-sm text-muted">{data.note}</p> : null}
        </div>
      </Container>
    </Section>
  );
}

/* Vision and mission (todo 05) */
export function VisionMission({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="grid gap-6 md:grid-cols-2">
        {[
          ["Vision", data.vision],
          ["Mission", data.mission],
        ].map(([label, text]) => (
          <div
            key={label}
            data-reveal
            className="flex flex-col gap-4 surface-card p-8 md:p-10"
          >
            <Eyebrow as="h2">{label}</Eyebrow>
            <p className="font-display text-[1.625rem] leading-snug text-primary">{text}</p>
          </div>
        ))}
      </Container>
    </Section>
  );
}

/* Values with bold lead-ins (todo 06) */
export function ValuesList({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        <ul className="grid gap-x-12 gap-y-5 md:grid-cols-2">
          {data.items.map((v) => (
            <li key={v.lead} className="flex gap-3">
              <Check aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" strokeWidth={2} />
              <p className="text-ink">
                <strong className="font-semibold text-primary">{v.lead}.</strong> {v.text}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* Proprietor message (todo 07) */
export async function ProprietorMessage({ data, tone }) {
  const image = data.imageId ? await getMedia(data.imageId) : null;
  return (
    <Section tone={tone}>
      <Container
        className={cn("grid gap-10", image && "lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16")}
      >
        {image ? (
          <MediaImage
            asset={image}
            aspect="4:5"
            sizes="(min-width: 1024px) 380px, 100vw"
            className="w-full surface-card"
          />
        ) : null}
        <figure className="flex flex-col gap-6">
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          {data.title ? <h2 className="text-h2">{data.title}</h2> : null}
          <blockquote className="flex measure flex-col gap-4 border-l-2 border-accent pl-6 text-body text-ink">
            {data.message
              .split("\n")
              .filter((p) => p.trim())
              .map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
          </blockquote>
          <figcaption className="pl-6">
            <span className="font-display text-xl text-primary">{data.name}</span>
            {data.role ? <span className="block text-small text-muted">{data.role}</span> : null}
          </figcaption>
        </figure>
      </Container>
    </Section>
  );
}

/* Image and text (todo 08 warehouse & logistics) */
export async function SplitFeature({ data, tone }) {
  const image = data.imageId ? await getMedia(data.imageId) : null;
  return (
    <Section tone={tone}>
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={cn("flex flex-col items-start gap-5", data.reverse && "lg:order-2")}>
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          <h2 className="text-h2">{data.title}</h2>
          {data.text ? <p className="measure text-muted">{data.text}</p> : null}
          {image && data.bullets.length ? (
            <ul className="flex flex-col gap-2">
              {data.bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-ink">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" strokeWidth={2} />{" "}
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
          <CtaButton cta={data.cta} variant="secondary" />
        </div>
        {image ? (
          <MediaImage
            asset={image}
            aspect="4:3"
            sizes="(min-width: 1024px) 560px, 100vw"
            className="w-full surface-card"
          />
        ) : data.bullets.length ? (
          <ul className="divide-y divide-line surface-card">
            {data.bullets.map((b) => (
              <li key={b} className="flex gap-3 px-5 py-4 text-ink">
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" strokeWidth={2} /> {b}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-card border border-dashed border-line text-muted">
            <ImageIcon aria-hidden="true" className="size-8" strokeWidth={1.25} />
          </div>
        )}
      </Container>
    </Section>
  );
}

/* Sourcing partners (todo 12) */
export function BrandList({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.brands.map((b) => (
            <li
              key={b.name}
              className="flex flex-col gap-1 surface-card px-5 py-4"
            >
              <span className="font-semibold text-primary">{b.name}</span>
              {b.note ? <span className="text-sm text-muted">We supply: {b.note}</span> : null}
            </li>
          ))}
        </ul>
        {data.disclaimer ? <p className="measure text-sm text-muted">{data.disclaimer}</p> : null}
      </Container>
    </Section>
  );
}

/* Packaging options (todo 13) */
export function Packaging({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map((p) => (
            <li
              key={p.name}
              data-reveal
              className="flex flex-col gap-2 surface-card p-5"
            >
              <span className="font-display text-[1.5rem] leading-tight text-primary">{p.name}</span>
              {p.spec ? <span className="font-data text-[0.8125rem] text-muted">{p.spec}</span> : null}
              {p.use ? <p className="mt-1 text-[0.9375rem] text-ink">{p.use}</p> : null}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* Icon cards (Why us benefits, documents) */
export function IconCards({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        <ul
          className={cn(
            "grid gap-5 sm:grid-cols-2",
            data.items.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4",
          )}
        >
          {data.items.map((c, i) => (
            <li
              key={c.title}
              data-reveal
              className="flex flex-col gap-3 surface-card p-6"
            >
              <IconBox icon={iconFor(c.icon)} />
              <h3 className="text-h3">{c.title}</h3>
              {c.text ? <p className="text-[0.9375rem] text-muted">{c.text}</p> : null}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* Contact block (todo 16) */
export function ContactBlock({ data, tone, ctx }) {
  const a = ctx.business.address;
  return (
    <Section tone={tone}>
      <Container className="grid gap-10 surface-card p-8 md:p-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <div className="flex flex-col items-start gap-4">
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          <h2 className="text-h2">{data.title}</h2>
          {data.text ? <p className="text-muted">{data.text}</p> : null}
          <CtaButton cta={data.cta} />
        </div>
        <address className="flex flex-col gap-4 text-ink not-italic">
          {data.showAddress ? (
            <p className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" strokeWidth={1.5} />
              <span>
                {a.line1}, {a.line2}
                <br />
                {a.city} {a.pin}, {a.country}
              </span>
            </p>
          ) : null}
          {data.showPhone && ctx.contact.phone ? (
            <a href={ctx.contact.phoneHref} className="flex gap-3 font-semibold text-primary hover:underline">
              <Phone aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />{" "}
              {ctx.contact.phone}
            </a>
          ) : null}
          {data.showEmail && ctx.contact.email ? (
            <a
              href={`mailto:${ctx.contact.email}`}
              className="flex gap-3 font-semibold text-primary hover:underline"
            >
              <Mail aria-hidden="true" className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />{" "}
              {ctx.contact.email}
            </a>
          ) : null}
        </address>
      </Container>
    </Section>
  );
}

/* Gallery (todo 14) */
export async function Gallery({ data, tone }) {
  const items = await getGalleryItems();
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={data} />
        {items.length ? (
          <GalleryGrid items={items} showFilters={data.showFilters} />
        ) : (
          <p className="rounded-card border border-dashed border-line px-6 py-12 text-center text-muted">
            Photos of our warehouse, stock and dispatch will appear here soon.
          </p>
        )}
      </Container>
    </Section>
  );
}

/* Job openings (todo 15) */
export function Openings({ data, tone, ctx }) {
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-8">
        <Heading d={data} />
        {data.jobs.length ? (
          <ul className="flex flex-col gap-4">
            {data.jobs.map((j) => (
              <li key={j.title} className="flex flex-col gap-2 surface-card p-6">
                <h3 className="text-h3">{j.title}</h3>
                <p className="text-small text-muted">{[j.location, j.type].filter(Boolean).join(" · ")}</p>
                {j.text ? <p className="measure text-ink">{j.text}</p> : null}
              </li>
            ))}
          </ul>
        ) : data.emptyText ? (
          <p className="surface-card p-6 text-ink">{data.emptyText}</p>
        ) : null}
        {data.applyText ? (
          <p className="measure text-ink">
            {data.applyText}{" "}
            {ctx.contact.email ? (
              <a href={`mailto:${ctx.contact.email}`} className="font-semibold text-primary underline">
                {ctx.contact.email}
              </a>
            ) : ctx.contact.phone ? (
              <a href={ctx.contact.phoneHref} className="font-semibold text-primary underline">
                {ctx.contact.phone}
              </a>
            ) : null}
          </p>
        ) : null}
      </Container>
    </Section>
  );
}

/* Downloads (Phase 15 todo 16): PDFs from the media library */
export async function Downloads({ data, tone }) {
  const files = (
    await Promise.all(data.items.map(async (i) => ({ ...i, media: await getMedia(i.mediaId) })))
  ).filter((f) => f.media?.type === "PDF");
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-8">
        <Heading d={data} />
        {files.length ? (
          <ul className="grid gap-3 md:grid-cols-2" data-testid="downloads">
            {files.map((f) => (
              <li key={f.mediaId}>
                <a
                  href={`/d/${f.mediaId}`}
                  rel="nofollow"
                  className="lift flex items-start gap-4 surface-card px-5 py-4"
                >
                  <FileDown aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold text-ink">{f.title}</span>
                    {f.text ? <span className="text-sm text-muted">{f.text}</span> : null}
                    <span className="text-[0.8125rem] text-muted">
                      PDF{f.media.bytes ? ` · ${formatBytes(f.media.bytes)}` : ""}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-card border border-dashed border-line p-8">
            <p className="text-muted">{data.emptyText}</p>
            <Button href="/contact#contact" variant="secondary" size="sm">
              Ask for the product list
            </Button>
          </div>
        )}
      </Container>
    </Section>
  );
}
