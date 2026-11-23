"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import { ProductCard } from "@/components/site/ProductCard";
import Link from "@/components/ui/SmartLink";
import { FAMILIES } from "@/lib/catalogue/families";
import { FAMILY_IMAGE, STOCK } from "@/lib/stockImages";
import { cn } from "@/lib/utils";

const norm = (s) => (s ?? "").toLowerCase();

function matches(p, q) {
  if (!q) return true;
  return [p.name, p.casNo, p.grade, p.purity, p.form, ...(p.applications ?? [])].some((v) =>
    norm(v).includes(q),
  );
}

/**
 * Products hub body (Phase 12 todo 17): family filter buttons, an instant filter box and every
 * category with its products. Works without JavaScript too (the server HTML lists everything).
 * Family filters are links (?family=slug), so they also work before hydration and can be shared.
 * @param {{ categories: object[], family?: string|null }} props
 */
export function CatalogueBrowser({ categories, family = null }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(norm(query.trim()));
  const familyKey = FAMILIES.find((f) => f.slug === family)?.key ?? null;

  const counts = useMemo(() => {
    const out = {};
    for (const c of categories) out[c.family] = (out[c.family] ?? 0) + c.products.length;
    return out;
  }, [categories]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const shown = useMemo(
    () =>
      categories
        .filter((c) => !familyKey || c.family === familyKey)
        .map((c) => ({ ...c, products: c.products.filter((p) => matches(p, deferred)) }))
        .filter((c) => c.products.length > 0),
    [categories, familyKey, deferred],
  );
  const hits = shown.reduce((n, c) => n + c.products.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div role="group" aria-label="Product families" className="flex flex-wrap gap-2">
          {[{ slug: null, key: null, name: "All products" }, ...FAMILIES].map((f) => {
            const active = (f.slug ?? null) === (familyKey ? family : null);
            const count = f.key ? (counts[f.key] ?? 0) : total;
            return (
              <Link
                key={f.slug ?? "all"}
                href={f.slug ? `/products?family=${f.slug}` : "/products"}
                replace
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-pill px-4 text-sm font-semibold transition-[background-color,box-shadow,color] duration-200",
                  active
                    ? "bg-primary text-primary-ink shadow-primary"
                    : "bg-card text-ink shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)] hover:text-primary hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-primary)_35%,transparent),var(--sh-sm)]",
                )}
              >
                {f.name}
                <span
                  className={cn(
                    "rounded-pill px-1.5 py-0.5 font-data text-[0.6875rem] leading-none",
                    active ? "bg-[color-mix(in_oklab,var(--c-primary-ink)_18%,transparent)] text-primary-ink" : "bg-surface text-muted",
                  )}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="relative max-w-xl">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, CAS number, grade or use"
            aria-label="Filter products"
            className="h-12 w-full rounded-pill border border-[color-mix(in_oklab,var(--c-ink)_12%,transparent)] bg-card pr-10 pl-10 text-[0.9375rem] text-ink shadow-xs transition-[border-color,box-shadow] duration-200 placeholder:text-muted focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--c-primary)_14%,transparent)] focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
        <p className="text-sm text-muted" aria-live="polite">
          {deferred
            ? `${hits} ${hits === 1 ? "product matches" : "products match"} “${query.trim()}”.`
            : `${hits} products in ${shown.length} categories.`}
        </p>
      </div>

      {shown.length ? (
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
      )}
    </div>
  );
}

/** Reads ?family= from the URL (client side, so the page itself stays static). */
export function CatalogueBrowserWithUrl({ categories }) {
  const family = useSearchParams().get("family");
  return <CatalogueBrowser categories={categories} family={family} />;
}
