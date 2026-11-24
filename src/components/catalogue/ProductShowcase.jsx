import { ArrowRight, BadgeCheck, PackageCheck } from "lucide-react";
import Image from "next/image";
import { createElement } from "react";

import { ProductCard, ProductRowCard } from "@/components/site/ProductCard";
import { Carousel } from "@/components/ui/Carousel";
import { MediaImage } from "@/components/ui/MediaImage";
import Link from "@/components/ui/SmartLink";
import { FAMILIES } from "@/lib/catalogue/families";
import { iconFor } from "@/lib/sections/icons";
import { FAMILY_IMAGE, imageForProduct, STOCK } from "@/lib/stockImages";

const withCategory = (p, c) => ({ ...p, category: { slug: c.slug, name: c.name, family: c.family } });

/** One large slide: photo on the left, the product's facts and actions on a dark panel on the right. */
function FeaturedSlide({ p, index, total }) {
  const href = `/products/${p.category.slug}/${p.slug}`;
  const photo = imageForProduct(p);
  return (
    <li className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${index + 1} of ${total}`}>
      <article className="group grid h-full overflow-hidden rounded-[calc(var(--r-card)+10px)] bg-band text-band-ink shadow-lg md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="relative min-h-64 overflow-hidden md:min-h-[22rem]">
          {p.image ? (
            <MediaImage asset={p.image} aspect="16:10" sizes="(min-width: 768px) 60vw, 100vw" className="h-full w-full" />
          ) : (
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-standard)] motion-safe:group-hover:scale-105"
            />
          )}
          <span className="absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-pill bg-white/92 px-3 py-1 text-xs font-bold text-primary shadow-sm">
            <BadgeCheck aria-hidden="true" className="size-3.5" /> Most ordered
          </span>
        </div>
        <div className="relative flex flex-col justify-center gap-4 bg-[radial-gradient(80%_90%_at_100%_0%,color-mix(in_oklab,var(--c-accent)_24%,transparent),transparent_60%)] p-7 md:p-10">
          <p className="text-sm font-semibold text-accent">{p.category.name}</p>
          <h3 className="text-h2 text-band-ink">
            <Link href={href} className="hover:underline hover:decoration-2 hover:underline-offset-4">
              {p.name}
            </Link>
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["CAS", p.casNo],
              ["Grade", [p.grade, p.purity].filter(Boolean).join(" · ")],
              ["Packs", p.packSizes?.slice(0, 2).join(", ")],
              ["MOQ", p.moq],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="rounded-btn bg-white/[0.07] px-3 py-2 ring-1 ring-white/10">
                  <dt className="text-[0.6875rem] font-bold tracking-wider text-band-ink/60 uppercase">{k}</dt>
                  <dd className="truncate font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
          </dl>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={href}
              className="inline-flex h-11 items-center gap-2 rounded-btn bg-band-ink px-5 text-[0.9375rem] font-semibold text-band shadow-md transition-transform motion-safe:hover:-translate-y-px"
            >
              View product <ArrowRight aria-hidden="true" className="size-[18px]" />
            </Link>
            <Link
              href={`/contact?product=${encodeURIComponent(p.slug)}#quote`}
              className="inline-flex h-11 items-center gap-2 rounded-btn px-5 text-[0.9375rem] font-semibold text-band-ink ring-1 ring-white/30 transition-colors hover:bg-white/10"
            >
              Get a quote
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

/** Full-width photo banner that opens a product family. */
function FamilyBanner({ fam, count, cats }) {
  const photo = FAMILY_IMAGE[fam.key] ?? STOCK.labPipette;
  return (
    <div
      data-reveal
      className="relative isolate flex min-h-44 flex-col justify-end gap-3 overflow-hidden rounded-[calc(var(--r-card)+8px)] p-6 text-white shadow-md md:min-h-52 md:flex-row md:items-end md:justify-between md:p-8"
    >
      <Image src={photo.src} alt="" fill sizes="(min-width: 1280px) 1200px, 100vw" className="-z-20 object-cover" />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,color-mix(in_oklab,var(--c-band)_96%,black)_0%,color-mix(in_oklab,var(--c-band)_80%,transparent)_50%,rgb(0_0_0/0.15)_100%)]"
      />
      <div className="flex max-w-2xl flex-col gap-2">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
          {createElement(iconFor(fam.icon), { "aria-hidden": "true", className: "size-5", strokeWidth: 1.75 })}
        </span>
        <h2 className="text-h2 text-white">{fam.name}</h2>
        {fam.text ? <p className="text-[0.9375rem] text-white/80">{fam.text}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <span className="rounded-pill bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25">
          {count} products · {cats} {cats === 1 ? "category" : "categories"}
        </span>
        <Link
          href={`/products?family=${fam.slug}`}
          scroll={false}
          className="inline-flex items-center gap-2 rounded-pill bg-white px-4 py-2 text-sm font-bold text-primary shadow-md transition-transform hover:translate-x-0.5"
        >
          See all <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Products hub default view (no filter, no search): a featured slider, then each family as a photo
 * banner followed by one carousel per category. Families alternate between tall photo cards and
 * compact row cards so the page does not repeat one pattern 87 times.
 */
export function ProductShowcase({ categories }) {
  const featured = categories
    .flatMap((c) => c.products.filter((p) => p.featured).map((p) => withCategory(p, c)))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-16 md:gap-20">
      {featured.length ? (
        <section aria-labelledby="featured-title">
          <Carousel
            label="Most ordered products"
            heading={
              <div className="flex flex-col gap-2">
                <p className="text-eyebrow">
                  <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" />
                  In stock all year
                </p>
                <h2 id="featured-title" className="text-h2">
                  Most ordered this month.
                </h2>
              </div>
            }
            trackClassName="gap-6"
          >
            {featured.map((p, i) => (
              <FeaturedSlide key={p.id} p={p} index={i} total={featured.length} />
            ))}
          </Carousel>
        </section>
      ) : null}

      {FAMILIES.map((fam, fi) => {
        const cats = categories.filter((c) => c.family === fam.key && c.products.length);
        if (!cats.length) return null;
        const count = cats.reduce((n, c) => n + c.products.length, 0);
        const compact = fi % 2 === 1;
        return (
          <section key={fam.key} className="flex flex-col gap-10" aria-label={fam.name}>
            <FamilyBanner fam={fam} count={count} cats={cats.length} />
            {cats.map((c) => (
              <div key={c.id} data-testid="hub-category">
                <Carousel
                  label={`${c.name} products`}
                  heading={
                    <div className="flex flex-col gap-1">
                      <h3 id={`cat-${c.slug}`} className="flex flex-wrap items-center gap-2.5 text-h3">
                        <PackageCheck aria-hidden="true" className="size-5 text-accent" strokeWidth={2} />
                        {c.name}
                        <span className="rounded-pill bg-[color-mix(in_oklab,var(--c-primary)_9%,transparent)] px-2.5 py-0.5 text-xs font-bold text-primary">
                          {c.products.length}
                        </span>
                      </h3>
                      {c.intro ? <p className="line-clamp-1 max-w-2xl text-sm text-muted">{c.intro}</p> : null}
                    </div>
                  }
                  action={
                    <Link
                      href={`/products/${c.slug}`}
                      className="mr-1 hidden text-sm font-bold text-primary hover:underline sm:inline"
                    >
                      View category
                    </Link>
                  }
                >
                  {c.products.map((p) => (
                    <li
                      key={p.id}
                      className={compact ? "w-[20rem] shrink-0 snap-start" : "w-[17.5rem] shrink-0 snap-start"}
                    >
                      {compact ? (
                        <ProductRowCard product={withCategory(p, c)} />
                      ) : (
                        <ProductCard product={withCategory(p, c)} />
                      )}
                    </li>
                  ))}
                </Carousel>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
