"use client";

import { ArrowRight, FlaskConical, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

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
        <div className="flex flex-col gap-6">
          {shown.map((c) => {
            const photo = FAMILY_IMAGE[c.family] ?? STOCK.labPipette;
            return (
              <section
                key={c.id}
                aria-labelledby={`cat-${c.slug}`}
                className="grid overflow-hidden rounded-[calc(var(--r-card)+4px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-sm)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
                data-testid="hub-category"
                data-reveal
              >
                <div className="group/cat relative isolate flex min-h-72 flex-col justify-end gap-2 overflow-hidden p-6 pt-16 text-white">
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 352px, 100vw"
                    className="-z-20 object-cover transition-transform duration-700 ease-[var(--ease-standard)] motion-safe:group-hover/cat:scale-105"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(0_0_0/0.1),color-mix(in_oklab,var(--c-band)_92%,black)_92%)]"
                  />
                  <span className="absolute top-4 left-4 rounded-pill bg-white/90 px-3 py-1 text-xs font-bold text-primary shadow-sm">
                    {c.products.length} {c.products.length === 1 ? "product" : "products"}
                  </span>
                  <h2 id={`cat-${c.slug}`} className="text-h3 text-white">
                    <Link href={`/products/${c.slug}`} className="after:absolute after:inset-0">
                      {c.name}
                    </Link>
                  </h2>
                  {c.intro ? <p className="line-clamp-3 text-sm leading-relaxed text-white/80">{c.intro}</p> : null}
                  <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold">
                    View category
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-white text-primary transition-transform duration-300 group-hover/cat:translate-x-1">
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </span>
                  </span>
                </div>
                <ul className="grid content-start gap-2 p-3 sm:grid-cols-2 md:p-4">
                  {c.products.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/products/${c.slug}/${p.slug}`}
                        className="group/p relative flex h-full items-start gap-3 rounded-[calc(var(--r-btn)+4px)] px-3.5 py-3 pr-10 transition-[background-color,box-shadow] duration-200 hover:bg-[color-mix(in_oklab,var(--c-primary)_5%,var(--c-card))] hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-primary)_20%,transparent)]"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,color-mix(in_oklab,var(--c-primary)_14%,var(--c-card)),color-mix(in_oklab,var(--c-accent)_22%,var(--c-card)))] text-primary"
                        >
                          <FlaskConical className="size-4" strokeWidth={1.75} />
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="font-semibold text-ink group-hover/p:text-primary">{p.name}</span>
                          <span className="flex flex-wrap gap-1.5 text-xs text-muted">
                            {p.casNo ? (
                              <span className="rounded-pill bg-surface px-2 py-0.5 font-semibold tabular-nums">CAS {p.casNo}</span>
                            ) : null}
                            {p.grade ? <span className="rounded-pill bg-surface px-2 py-0.5">{p.grade}</span> : null}
                            {p.packSizes?.length ? (
                              <span className="rounded-pill bg-surface px-2 py-0.5">{p.packSizes.slice(0, 2).join(", ")}</span>
                            ) : null}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="absolute top-4 right-3.5 size-4 text-primary opacity-0 transition-[opacity,transform] duration-200 group-hover/p:translate-x-0.5 group-hover/p:opacity-100"
                        />
                      </Link>
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
