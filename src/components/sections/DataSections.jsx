import { ArrowRight, Quote } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/Button";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { MediaImage } from "@/components/ui/MediaImage";
import { getClientLogos, getFeaturedProducts, getLatestPosts, getTestimonials } from "@/lib/sections/data";

const HeadingRow = ({ d, cta }) => (
  <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
    <SectionHeading eyebrow={d.eyebrow} title={d.title} intro={d.intro} />
    {cta?.text && cta?.href ? (
      <Button href={cta.href} variant="secondary" className="shrink-0">
        {cta.text} <ArrowRight aria-hidden="true" />
      </Button>
    ) : null}
  </div>
);

/* 06 — featured products (hidden until products are marked featured) */
export async function FeaturedProducts({ data, tone }) {
  const products = await getFeaturedProducts(data.limit);
  if (!products.length) return null;
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <HeadingRow d={data} cta={data.cta} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <li data-reveal key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

/* 11 — client logos (grey, colour on hover) */
export async function ClientLogos({ data, tone }) {
  const logos = await getClientLogos();
  if (!logos.length) return null;
  return (
    <Section tone={tone} spacing="tight">
      <Container className="flex flex-col gap-8">
        <SectionHeading eyebrow={data.eyebrow} title={data.title} />
        <ul className="grid grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {logos.map((l) => {
            const img = l.media ? (
              <Image
                src={l.media.url}
                alt={l.media.alt || l.name}
                width={l.media.width ?? 200}
                height={l.media.height ?? 80}
                sizes="180px"
                className="mx-auto h-12 w-auto max-w-full object-contain opacity-70 grayscale transition duration-200 hover:opacity-100 hover:grayscale-0"
              />
            ) : (
              <span className="font-semibold text-muted">{l.name}</span>
            );
            return (
              <li
                key={l.id}
                className="flex h-20 items-center justify-center rounded-card border border-line bg-card px-4"
              >
                {l.url ? (
                  <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={l.name}>
                    {img}
                  </a>
                ) : (
                  img
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

/* 12 — testimonials */
export async function Testimonials({ data, tone }) {
  const items = await getTestimonials();
  if (!items.length) return null;
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <SectionHeading eyebrow={data.eyebrow} title={data.title} />
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <li data-reveal key={t.id}>
              <figure className="flex h-full flex-col gap-5 rounded-card border border-line bg-card p-6">
                <Quote aria-hidden="true" className="size-5 text-accent" strokeWidth={1.5} />
                <blockquote className="flex-1 text-ink">{t.quote}</blockquote>
                <figcaption className="border-t border-line pt-4 text-sm">
                  <span className="font-semibold text-ink">{t.name}</span>
                  <span className="block text-muted">
                    {[t.role, t.company, t.city].filter(Boolean).join(", ")}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/* 13 — latest insights */
export async function Insights({ data, tone }) {
  const posts = await getLatestPosts(data.limit);
  if (!posts.length) return null;
  return (
    <Section tone={tone}>
      <Container className="flex flex-col gap-10">
        <HeadingRow d={data} cta={data.cta} />
        <ul className="grid gap-6 md:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-card transition-colors hover:border-primary">
                {p.cover ? (
                  <MediaImage
                    asset={p.cover}
                    aspect="16:9"
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="w-full border-b border-line"
                  />
                ) : null}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <p className="text-[0.8125rem] text-muted">
                    {p.category} ·{" "}
                    <time dateTime={p.publishedAt.toISOString()}>{dateFmt.format(p.publishedAt)}</time>
                  </p>
                  <h3 className="text-h3 leading-snug">
                    <Link href={`/insights/${p.slug}`} className="after:absolute after:inset-0">
                      {p.title}
                    </Link>
                  </h3>
                  {p.excerpt ? <p className="text-[0.9375rem] text-muted">{p.excerpt}</p> : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
