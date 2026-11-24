"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";

import { ProductCard } from "@/components/site/ProductCard";
import Link from "@/components/ui/SmartLink";
import { FAMILY_IMAGE, STOCK } from "@/lib/stockImages";

/**
 * Filtered / searched view of the products hub. Loaded on demand (next/dynamic) only when a family
 * filter or a search is active, so the default page ships less JavaScript.
 * @param {{ shown: object[], query: string }} props
 */
export default function CatalogueResults({ shown, query }) {
  return shown.length ? (
        <div className="flex flex-col gap-16">
          {shown.map((c) => {
            const photo = FAMILY_IMAGE[c.family] ?? STOCK.labPipette;
            return (
              <section key={c.id} aria-labelledby={`cat-${c.slug}`} className="flex flex-col gap-6" data-testid="hub-category">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
                  <div className="flex items-start gap-4">
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-full shadow-md ring-4 ring-[color-mix(in_oklab,var(--c-primary)_10%,transparent)]">
                      <Image src={photo.src} alt="" fill sizes="64px" className="object-cover" />
                    </span>
                    <div className="flex max-w-2xl flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 id={`cat-${c.slug}`} className="text-h3">
                          <Link href={`/products/${c.slug}`} className="hover:text-primary">
                            {c.name}
                          </Link>
                        </h2>
                        <span className="rounded-pill bg-[color-mix(in_oklab,var(--c-primary)_9%,transparent)] px-2.5 py-0.5 text-xs font-bold text-primary">
                          {c.products.length} {c.products.length === 1 ? "product" : "products"}
                        </span>
                      </div>
                      {c.intro ? <p className="line-clamp-2 text-[0.9375rem] text-muted">{c.intro}</p> : null}
                    </div>
                  </div>
                  <Link
                    href={`/products/${c.slug}`}
                    className="group/cat inline-flex shrink-0 items-center gap-2 self-start text-sm font-bold text-primary md:self-auto"
                  >
                    View category
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-primary-ink shadow-primary transition-transform duration-300 group-hover/cat:translate-x-1">
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </span>
                  </Link>
                </div>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {c.products.map((p) => (
                    <li key={p.id} data-reveal>
                      <ProductCard product={{ ...p, category: { slug: c.slug, name: c.name, family: c.family } }} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-[color-mix(in_oklab,var(--c-ink)_18%,transparent)] bg-card/60 p-8">
          <p className="font-semibold text-ink">Nothing matches “{query.trim()}”.</p>
          <p className="text-sm text-muted">
            We source many materials that are not listed. Tell us what you need and we will check with our
            producers.
          </p>
          <Link
            href="/contact#quote"
            className="text-sm font-semibold text-primary underline underline-offset-4"
          >
            Ask for a product
          </Link>
        </div>
  );
}
