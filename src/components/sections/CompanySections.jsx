import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Eye,
  FileDown,
  Flag,
  Globe,
  ImageIcon,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Quote,
  ReceiptText,
  UserRound,
  Users,
} from "lucide-react";
import Image from "next/image";

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
import { STOCK } from "@/lib/stockImages";
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
/** Photo trio per company page (an uploaded hero photo replaces the large one). */
const HERO_TRIOS = {
  "why-us": [STOCK.plantPipes, STOCK.labFlasks, STOCK.scientist],
  about: [STOCK.warehouseFloor, STOCK.microscopes, STOCK.trucks],
  quality: [STOCK.labCorridor, STOCK.microscopes, STOCK.labPipette],
  default: [STOCK.warehousePallets, STOCK.labFlasks, STOCK.trucks],
};

/* Page header (todo 01): editorial split — text on the left, a staggered photo trio on the right. */
/** Text column shared by the page heroes. */
function HeroCopy({ data, ctx, secondary }) {
  return (
    <div className="flex flex-col items-start gap-5">
      <Breadcrumb items={[{ label: ctx.page.title }]} />
      {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
      <h1 id="page-title" className="max-w-[17ch] text-display">
        {data.title}
      </h1>
      {data.intro ? <p className="measure text-lead">{data.intro}</p> : null}
      <div className="flex flex-wrap gap-3 pt-1">
        <Button href="/contact#quote" size="lg">
          Request a quote <ArrowRight aria-hidden="true" />
        </Button>
        <Button href={secondary.href} size="lg" variant="secondary">
          <secondary.icon aria-hidden="true" /> {secondary.text}
        </Button>
      </div>
    </div>
  );
}

/* About: slanted photo mosaic (big warehouse + two stacked) with an "Established" card. */
async function AboutHero({ data, ctx, image }) {
  return (
    <section className="relative isolate overflow-hidden bg-surface" aria-labelledby="page-title">
      <div className="container-site hero-in grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-12">
        <HeroCopy data={data} ctx={ctx} secondary={{ href: "/downloads", text: "Download company profile", icon: FileDown }} />
        <div className="relative hidden h-[32rem] gap-3 sm:grid sm:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" aria-hidden="true">
          <div className="relative overflow-hidden [clip-path:polygon(18%_0,100%_0,82%_100%,0_100%)]">
            {image ? (
              <MediaImage asset={image} aspect="3:4" priority sizes="40vw" className="h-full w-full" />
            ) : (
              <Image src={STOCK.drumsWarehouse.src} alt="" fill priority sizes="40vw" className="object-cover" />
            )}
          </div>
          <div className="-ml-16 grid grid-rows-2 gap-3 py-8">
            <div className="relative overflow-hidden [clip-path:polygon(22%_0,100%_0,90%_100%,10%_100%)]">
              <Image src={STOCK.ibcStore.src} alt="" fill sizes="25vw" className="object-cover" />
            </div>
            <div className="relative overflow-hidden [clip-path:polygon(10%_0,90%_0,78%_100%,0_100%)]">
              <Image src={STOCK.trucks.src} alt="" fill sizes="25vw" className="object-cover" />
            </div>
          </div>
          {ctx.business?.established ? (
            <div className="absolute bottom-10 left-[30%] flex items-center gap-3 rounded-card bg-band px-5 py-4 text-band-ink shadow-lg">
              <CalendarDays className="size-7 text-accent" strokeWidth={1.75} />
              <span className="text-lg leading-tight font-bold">
                Established
                <br />
                since {ctx.business.established}.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* Quality: photo of storage tanks inside a large curved frame on the right. */
async function QualityHero({ data, ctx, image }) {
  return (
    <section className="relative isolate overflow-hidden bg-surface" aria-labelledby="page-title">
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[52%] overflow-hidden rounded-l-[50%_100%] shadow-[-30px_0_0_0_color-mix(in_oklab,var(--c-accent)_18%,transparent)] lg:block">
        {image ? (
          <MediaImage asset={image} aspect="4:3" priority sizes="52vw" className="h-full w-full" />
        ) : (
          <Image src={STOCK.tanks.src} alt="" fill priority sizes="52vw" className="object-cover" />
        )}
      </div>
      <div className="container-site hero-in grid py-12 md:py-16 lg:grid-cols-[minmax(0,11fr)_minmax(0,13fr)] lg:py-24">
        <HeroCopy data={data} ctx={ctx} secondary={{ href: "/downloads", text: "Documents and downloads", icon: FileDown }} />
      </div>
      <div className="relative aspect-[16/9] lg:hidden">
        <Image src={STOCK.tanks.src} alt="" fill sizes="100vw" className="object-cover" />
      </div>
    </section>
  );
}

export async function PageHero({ data, ctx }) {
  const image = data.imageId ? await getMedia(data.imageId) : null;
  if (ctx.page.slug === "about") return <AboutHero data={data} ctx={ctx} image={image} />;
  if (ctx.page.slug === "quality") return <QualityHero data={data} ctx={ctx} image={image} />;
  const [big, small, tall] = HERO_TRIOS[ctx.page.slug] ?? HERO_TRIOS.default;
  const since = ctx.business?.established;
  return (
    <section className="relative isolate overflow-hidden bg-surface" aria-labelledby="page-title">
      <div
        aria-hidden="true"
        className="absolute -top-40 -right-40 -z-10 size-[42rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--c-accent)_22%,transparent),transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 -z-10 h-24 w-full bg-[linear-gradient(180deg,transparent,var(--c-bg))]"
      />
      <Container className="hero-in grid items-center gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-16 lg:py-20">
        <div className="flex flex-col items-start gap-5">
          <Breadcrumb items={[{ label: ctx.page.title }]} />
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          <h1 id="page-title" className="max-w-[16ch] text-display">
            {data.title}
          </h1>
          <span aria-hidden="true" className="h-1 w-16 rounded-pill bg-[linear-gradient(90deg,var(--c-accent),transparent)]" />
          {data.intro ? <p className="measure text-lead">{data.intro}</p> : null}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button href="/contact#quote" size="lg">
              Request a quote <ArrowRight aria-hidden="true" />
            </Button>
            <Button href="/products" size="lg" variant="secondary">
              See the products
            </Button>
          </div>
        </div>

        <div className="relative hidden h-[30rem] sm:block" aria-hidden={image ? undefined : "true"}>
          <div className="absolute top-0 right-0 h-[72%] w-[78%] overflow-hidden rounded-[calc(var(--r-card)+10px)] shadow-lg">
            {image ? (
              <MediaImage asset={image} aspect="4:3" priority sizes="(min-width: 1024px) 460px, 80vw" className="h-full w-full" />
            ) : (
              <Image src={big.src} alt="" fill priority sizes="(min-width: 1024px) 460px, 80vw" className="object-cover" />
            )}
          </div>
          <div className="absolute bottom-0 left-0 h-[48%] w-[46%] overflow-hidden rounded-[calc(var(--r-card)+6px)] shadow-lg ring-8 ring-[var(--c-surface)]">
            <Image src={small.src} alt="" fill sizes="280px" className="object-cover" />
          </div>
          <div className="absolute right-6 bottom-2 h-[34%] w-[30%] overflow-hidden rounded-[calc(var(--r-card)+4px)] shadow-lg ring-8 ring-[var(--c-surface)]">
            <Image src={tall.src} alt="" fill sizes="200px" className="object-cover" />
          </div>
          {since ? (
            <div className="absolute top-10 left-2 flex items-center gap-3 rounded-pill bg-card py-2 pr-5 pl-2 shadow-lg">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-ink">
                <BadgeCheck className="size-5" strokeWidth={2} />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-muted">Trusted since</span>
                <span className="text-lg font-extrabold tracking-tight text-ink">{since}</span>
              </span>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/* Rich text (todo 02): sanitised on save AND again here before rendering */
export function RichText({ data, tone, ctx }) {
  const html = sanitizeRichText(data.body);
  // Without an aside (e.g. Quality): a two-column "what we do": heading left, text right.
  if (!data.aside) {
    return (
      <Section tone={tone}>
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_auto_minmax(0,7fr)] lg:gap-12">
          <div data-reveal className="flex flex-col gap-4">
            <p className="flex items-center gap-3 text-sm font-bold text-primary">
              <span aria-hidden="true" className="h-1 w-8 rounded-pill bg-accent" />
              {data.eyebrow || (ctx?.page?.slug === "quality" ? "What we check" : "In short")}
            </p>
            <h2 className="text-h2">{data.title || ctx?.page?.title}</h2>
          </div>
          <span aria-hidden="true" className="hidden w-px bg-hairline lg:block" />
          <div data-reveal className="prose-site text-body text-muted" dangerouslySetInnerHTML={{ __html: html }} />
        </Container>
      </Section>
    );
  }
  return (
    <Section tone={tone}>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <div data-reveal className="flex flex-col gap-5">
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          {data.title ? <h2 className="text-h2">{data.title}</h2> : null}
          <div className="prose-site measure text-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <aside
          data-reveal
          className="relative self-center overflow-hidden rounded-[calc(var(--r-card)+6px)] bg-card p-8 shadow-[0_0_0_1px_var(--hairline),var(--sh-lg)] md:p-10"
        >
          <Quote aria-hidden="true" className="mb-4 size-10 text-accent" strokeWidth={1.5} fill="currentColor" />
          <p className="text-[1.25rem] leading-relaxed font-medium text-ink italic md:text-[1.375rem]">{data.aside}</p>
          <span aria-hidden="true" className="mt-6 block h-1 w-14 rounded-pill bg-accent" />
        </aside>
      </Container>
    </Section>
  );
}

/* Timeline (todo 03): a rail of years with a dot per milestone; the latest one is highlighted. */
export function Timeline({ data, tone }) {
  const last = data.items.length - 1;
  const heading = data.title ? data : { ...data, eyebrow: data.eyebrow || "Our journey", title: "How the business grew." };
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={heading} />
        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5 lg:pt-8">
          <span
            aria-hidden="true"
            className="absolute top-[0.6875rem] right-[10%] left-[10%] hidden h-0.5 rounded-pill bg-[linear-gradient(90deg,color-mix(in_oklab,var(--c-accent)_40%,transparent),var(--c-accent))] lg:block"
          />
          {data.items.map((m, i) => (
            <li key={`${m.year}-${m.title}`} data-reveal className="relative flex flex-col">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded-full ring-4 ring-[var(--c-bg)] lg:block",
                  i === last ? "size-6 bg-accent" : "size-4 bg-[color-mix(in_oklab,var(--c-accent)_55%,var(--c-card))]",
                )}
              />
              <div
                className={cn(
                  "flex h-full flex-col gap-2 rounded-[calc(var(--r-card)+2px)] bg-card p-5 shadow-[0_0_0_1px_var(--hairline),var(--sh-sm)] transition-transform duration-300 motion-safe:hover:-translate-y-1",
                  i === last && "shadow-[0_0_0_2px_color-mix(in_oklab,var(--c-accent)_70%,transparent),var(--sh-md)]",
                )}
              >
                <span className="text-[1.75rem] leading-none font-extrabold tracking-tight text-primary">{m.year}</span>
                <h3 className="text-h4">{m.title}</h3>
                {m.text ? <p className="text-sm leading-relaxed text-muted">{m.text}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

const FACT_ICONS = {
  "Nature of business": Boxes,
  Proprietor: UserRound,
  "Year established": CalendarDays,
  Team: Users,
  Banker: Landmark,
  GSTIN: ReceiptText,
  Market: Globe,
  Address: MapPin,
};

/* Key facts (todo 04): business facts come from Settings > Business details */
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
    <section className={cn("overflow-hidden", tone === "surface" ? "bg-surface" : "bg-bg")}>
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative min-h-64 lg:min-h-full lg:[clip-path:polygon(0_0,100%_0,82%_100%,0_100%)]">
          <Image
            src={STOCK.drumsWarehouse.src}
            alt={STOCK.drumsWarehouse.alt}
            fill
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-8 px-4 py-14 md:px-10 lg:py-20 lg:pr-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
          <Heading d={data} />
          <dl className="grid gap-x-10 sm:grid-cols-2">
            {rows.map(([k, v]) => {
              const Icon = FACT_ICONS[k] ?? Check;
              return (
                <div key={k} data-reveal className="flex gap-4 border-b border-hairline py-4">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--c-primary)_8%,transparent)] text-primary">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <dt className="text-sm font-bold text-ink">{k}</dt>
                    <dd className={cn("text-[0.9375rem] text-muted", k === "GSTIN" && "tabular-nums")}>{v}</dd>
                  </span>
                </div>
              );
            })}
          </dl>
          {data.note ? <p className="text-sm text-muted">{data.note}</p> : null}
        </div>
      </div>
    </section>
  );
}

/* Vision and mission (todo 05): light vision card, dark mission card, and a photo. */
export function VisionMission({ data, tone }) {
  return (
    <Section tone={tone}>
      <Container className="grid gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,3fr)]">
        <div
          data-reveal
          className="flex gap-5 rounded-[calc(var(--r-card)+4px)] bg-card p-7 shadow-[0_0_0_1px_var(--hairline),var(--sh-md)] md:p-8"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--c-accent)_16%,transparent)] text-accent-text">
            <Eye aria-hidden="true" className="size-6" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-3">
            <Eyebrow as="h2">Our vision</Eyebrow>
            <p className="text-[1.125rem] leading-relaxed font-semibold text-ink">{data.vision}</p>
          </div>
        </div>
        <div
          data-reveal
          className="flex gap-5 rounded-[calc(var(--r-card)+4px)] bg-band bg-[radial-gradient(80%_120%_at_100%_0%,color-mix(in_oklab,var(--c-accent)_24%,transparent),transparent_60%)] p-7 text-band-ink shadow-lg md:p-8"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-accent ring-1 ring-white/20">
            <Flag aria-hidden="true" className="size-6" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-3">
            <Eyebrow as="h2" onBand>
              Our mission
            </Eyebrow>
            <p className="text-[1.125rem] leading-relaxed font-semibold text-band-ink">{data.mission}</p>
          </div>
        </div>
        <div
          data-reveal
          className="relative hidden min-h-48 overflow-hidden rounded-[calc(var(--r-card)+4px)] shadow-md lg:block"
        >
          <Image src={STOCK.warehousePallets.src} alt="" fill sizes="320px" className="object-cover" />
        </div>
      </Container>
    </Section>
  );
}

/* Values with bold lead-ins (todo 06): numbered steps joined by arrows. */
export function ValuesList({ data, tone }) {
  const cols = data.items.length % 3 === 0 ? 3 : 4;
  const heading = data.title
    ? data
    : { ...data, eyebrow: data.eyebrow || "Our approach", title: "How we work, in plain words." };
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <Heading d={heading} />
        <ol className={cn("grid gap-6 gap-y-10 sm:grid-cols-2 lg:gap-x-14", cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
          {data.items.map((v, i) => (
            <li key={v.lead} data-reveal className="relative flex flex-col gap-2">
              <span className="text-[2.25rem] leading-none font-extrabold tracking-tight text-[color-mix(in_oklab,var(--c-accent)_85%,var(--c-ink))]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-h4 text-ink">{v.lead}.</h3>
              <p className="text-[0.9375rem] leading-relaxed text-muted">{v.text}</p>
              {i < data.items.length - 1 && (i + 1) % cols !== 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-2 -right-8 hidden size-8 items-center justify-center rounded-full bg-card text-primary shadow-[0_0_0_1px_var(--hairline),var(--sh-sm)] lg:inline-flex"
                >
                  <ChevronRight className="size-4" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/* Proprietor message (todo 07): photo with a slanted edge, the note, a handwritten-style signature. */
export async function ProprietorMessage({ data, tone }) {
  const image = data.imageId ? await getMedia(data.imageId) : null;
  return (
    <section className={cn("overflow-hidden", tone === "surface" ? "bg-surface" : "bg-bg")}>
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative min-h-72 lg:min-h-full lg:[clip-path:polygon(0_0,100%_0,84%_100%,0_100%)]">
          {image ? (
            <MediaImage asset={image} aspect="4:5" sizes="(min-width: 1024px) 40vw, 100vw" className="h-full w-full" />
          ) : (
            <Image
              src={STOCK.warehouseFloor.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        <figure
          data-reveal
          className="flex flex-col gap-5 px-4 py-14 md:px-10 lg:py-20 lg:pr-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]"
        >
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          {data.title ? <h2 className="text-h2">{data.title}</h2> : null}
          <blockquote className="flex flex-col gap-3 text-body text-muted">
            {data.message
              .split("\n")
              .filter((p) => p.trim())
              .map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
          </blockquote>
          <figcaption className="flex flex-col gap-0.5">
            <span className="font-signature text-[1.75rem] leading-tight text-primary">{data.name}</span>
            {data.role ? <span className="text-sm text-muted">{data.role}</span> : null}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/* Image and text (todo 08 warehouse & logistics): text, a photo, and the facts as a compact table. */
export async function SplitFeature({ data, tone }) {
  const image = data.imageId ? await getMedia(data.imageId) : null;
  const facts = data.bullets.map((b) => {
    const [k, ...rest] = b.split(/:\s+/);
    return rest.length ? [k, rest.join(": ")] : [null, b];
  });
  return (
    <Section tone={tone}>
      <Container className="grid items-center gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)_minmax(0,5fr)] lg:gap-10">
        <div data-reveal className="flex flex-col items-start gap-4">
          {data.eyebrow ? <Eyebrow>{data.eyebrow}</Eyebrow> : null}
          <h2 className="text-h2">{data.title}</h2>
          {data.text ? <p className="text-muted">{data.text}</p> : null}
          <CtaButton cta={data.cta} variant="secondary" />
        </div>
        <div
          data-reveal
          className="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--r-card)+4px)] shadow-lg lg:aspect-[3/4]"
        >
          {image ? (
            <MediaImage asset={image} aspect="3:4" sizes="(min-width: 1024px) 320px, 100vw" className="h-full w-full" />
          ) : (
            <Image
              src={STOCK.ibcStore.src}
              alt={STOCK.ibcStore.alt}
              fill
              sizes="(min-width: 1024px) 320px, 100vw"
              className="object-cover"
            />
          )}
        </div>
        {facts.length ? (
          <dl
            data-reveal
            className="divide-y divide-hairline overflow-hidden rounded-[calc(var(--r-card)+4px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-md)]"
          >
            {facts.map(([k, v]) => (
              <div key={v} className="flex items-start gap-3 px-5 py-3.5">
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" strokeWidth={2.5} />
                {k ? (
                  <span className="grid flex-1 gap-1 sm:grid-cols-[8rem_1fr] sm:gap-4">
                    <dt className="text-sm font-bold text-ink">{k}</dt>
                    <dd className="text-sm text-muted">{v}</dd>
                  </span>
                ) : (
                  <dd className="text-[0.9375rem] text-ink">{v}</dd>
                )}
              </div>
            ))}
          </dl>
        ) : null}
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
export function Packaging({ data, tone, ctx }) {
  if (ctx?.page?.slug === "quality") {
    return (
      <Section tone={tone}>
        <Container>
          <div className="grid items-center gap-8 overflow-hidden rounded-[calc(var(--r-card)+8px)] bg-card p-6 shadow-[0_0_0_1px_var(--hairline),var(--sh-md)] md:p-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10">
            <div className="flex flex-col gap-5">
              <h2 className="flex items-center gap-3 text-h3">
                <span aria-hidden="true" className="h-1 w-8 rounded-pill bg-accent" />
                {data.title || "Packs we supply."}
              </h2>
              {data.intro ? <p className="text-sm text-muted">{data.intro}</p> : null}
              <div className="relative hidden aspect-[4/3] overflow-hidden rounded-card lg:block">
                <Image src={STOCK.labBench.src} alt={STOCK.labBench.alt} fill sizes="380px" className="object-cover" />
              </div>
            </div>
            <dl data-reveal className="divide-y divide-hairline overflow-hidden rounded-card shadow-[0_0_0_1px_var(--hairline)]">
              <div className="hidden grid-cols-[10rem_12rem_1fr] gap-4 bg-surface px-5 py-3 text-xs font-bold tracking-wider text-muted uppercase sm:grid">
                <span>Pack</span>
                <span>Material</span>
                <span>Best for</span>
              </div>
              {data.items.map((p) => (
                <div
                  key={p.name}
                  className="grid gap-1 px-5 py-3.5 transition-colors hover:bg-[color-mix(in_oklab,var(--c-primary)_3%,transparent)] sm:grid-cols-[10rem_12rem_1fr] sm:gap-4"
                >
                  <dt className="font-bold text-ink">{p.name}</dt>
                  <dd className="text-sm text-muted">{p.spec}</dd>
                  <dd className="text-sm text-ink">{p.use}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </Section>
    );
  }
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
export function IconCards({ data, ctx }) {
  if (ctx?.page?.slug === "quality") {
    return (
      <section className="bg-[linear-gradient(180deg,var(--c-bg),color-mix(in_oklab,var(--c-accent)_8%,var(--c-surface)))] py-12 md:py-16">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:items-center">
          <h2 className="flex items-center gap-3 text-h3">
            <span aria-hidden="true" className="h-1 w-8 rounded-pill bg-accent" />
            {data.title || "Documents we send"}
          </h2>
          <ul className={cn("grid gap-6 sm:grid-cols-2", data.items.length % 2 === 0 ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
            {data.items.map((c, i) => {
              const Icon = iconFor(c.icon);
              return (
                <li
                  key={c.title}
                  data-reveal
                  className={cn("flex gap-4 rounded-card bg-card/70 p-4 shadow-[0_0_0_1px_var(--hairline)]")}
                >
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-[0_0_0_1px_var(--hairline),var(--sh-sm)]">
                    <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <h3 className="text-h4">{c.title}</h3>
                    {c.text ? <p className="text-sm leading-relaxed text-muted">{c.text}</p> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>
    );
  }
  // Dark photo band with glass cards: the page's "benefits" moment.
  return (
    <section className="relative isolate overflow-hidden bg-band py-16 text-band-ink md:py-24">
      <Image src={STOCK.warehouseFloor.src} alt="" fill sizes="100vw" className="-z-20 object-cover" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--c-band)_94%,transparent),color-mix(in_oklab,var(--c-band)_80%,transparent))]"
      />
      <Container className="flex flex-col gap-10">
        {data.eyebrow || data.title || data.intro ? (
          <div data-reveal className="flex max-w-3xl flex-col gap-4">
            {data.eyebrow ? <Eyebrow onBand>{data.eyebrow}</Eyebrow> : null}
            {data.title ? <h2 className="text-h2 text-band-ink">{data.title}</h2> : null}
            <span aria-hidden="true" className="h-1 w-16 rounded-pill bg-accent" />
            {data.intro ? <p className="text-lead text-band-ink/75">{data.intro}</p> : null}
          </div>
        ) : null}
        <ul
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            data.items.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4",
          )}
        >
          {data.items.map((c) => {
            const Icon = iconFor(c.icon);
            return (
              <li
                key={c.title}
                data-reveal
                className="group flex flex-col gap-3 rounded-[calc(var(--r-card)+2px)] bg-white/[0.07] p-6 ring-1 ring-white/15 transition-[background-color,transform] duration-300 hover:bg-white/[0.12] motion-safe:hover:-translate-y-1"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-btn bg-[color-mix(in_oklab,var(--c-accent)_22%,transparent)] text-accent ring-1 ring-[color-mix(in_oklab,var(--c-accent)_40%,transparent)]">
                  <Icon aria-hidden="true" className="size-6" strokeWidth={1.75} />
                </span>
                <h3 className="text-h4 text-band-ink">{c.title}</h3>
                {c.text ? <p className="text-[0.9375rem] leading-relaxed text-band-ink/75">{c.text}</p> : null}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

/* Contact block (todo 16) */
export function ContactBlock({ data, tone, ctx }) {
  const a = ctx.business.address;
  // Dark band: the ask on the left, how to reach us in the middle, a road photo fading in on the right.
  return (
    <Section tone={tone} spacing="tight">
      <Container>
        <div
          data-reveal
          className="relative isolate grid gap-8 overflow-hidden rounded-[calc(var(--r-card)+8px)] bg-band p-8 text-band-ink shadow-lg md:p-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] lg:items-center"
        >
          <Image src={STOCK.trucks.src} alt="" fill sizes="100vw" className="-z-20 object-cover object-right" />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--c-band)_45%,color-mix(in_oklab,var(--c-band)_80%,transparent)_70%,color-mix(in_oklab,var(--c-band)_25%,transparent))]"
          />
          <div className="flex flex-col items-start gap-4">
            {data.eyebrow ? <Eyebrow onBand>{data.eyebrow}</Eyebrow> : null}
            <h2 className="text-h2 text-band-ink">{data.title}</h2>
            {data.text ? <p className="text-band-ink/75">{data.text}</p> : null}
            <CtaButton cta={data.cta} variant="onBand" />
          </div>
          <address className="flex flex-col gap-4 border-white/15 text-band-ink not-italic lg:border-l lg:pl-8">
            {data.showAddress ? (
              <p className="flex gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
                <span>
                  {a.line1}, {a.line2}, {a.city} {a.pin}, {a.country}
                </span>
              </p>
            ) : null}
            {data.showPhone && ctx.contact.phone ? (
              <a href={ctx.contact.phoneHref} className="flex gap-3 font-semibold hover:underline">
                <Phone aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
                {ctx.contact.phone}
              </a>
            ) : null}
            {data.showEmail && ctx.contact.email ? (
              <a href={`mailto:${ctx.contact.email}`} className="flex gap-3 font-semibold break-all hover:underline">
                <Mail aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
                {ctx.contact.email}
              </a>
            ) : null}
            {ctx.business.hours ? (
              <p className="flex gap-3">
                <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
                {ctx.business.hours}
              </p>
            ) : null}
          </address>
        </div>
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
