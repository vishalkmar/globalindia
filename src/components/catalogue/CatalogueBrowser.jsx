"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import { FAMILIES } from "@/lib/catalogue/families";
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
                  "inline-flex h-10 items-center gap-2 rounded-btn border px-3.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-ink"
                    : "border-line bg-card text-ink hover:border-primary",
                )}
              >
                {f.name}
                <span
                  className={cn("font-data text-[0.75rem]", active ? "text-primary-ink/80" : "text-muted")}
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
            className="h-12 w-full rounded-btn border border-line bg-card pr-10 pl-10 text-[0.9375rem] text-ink placeholder:text-muted focus-visible:border-primary"
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
          {shown.map((c) => (
            <section
              key={c.id}
              aria-labelledby={`cat-${c.slug}`}
              className="surface-card"
              data-testid="hub-category"
            >
              <div className="flex flex-col gap-2 border-b border-line p-5 md:flex-row md:items-end md:justify-between md:gap-8 md:p-6">
                <div className="flex max-w-3xl flex-col gap-1.5">
                  <h2 id={`cat-${c.slug}`} className="text-h3">
                    <Link
                      href={`/products/${c.slug}`}
                      className="hover:underline hover:decoration-1 hover:underline-offset-4"
                    >
                      {c.name}
                    </Link>
                  </h2>
                  {c.intro ? <p className="text-[0.9375rem] text-muted">{c.intro}</p> : null}
                </div>
                <Link
                  href={`/products/${c.slug}`}
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary"
                >
                  View category <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
              <ul className="grid divide-line sm:grid-cols-2 lg:grid-cols-3">
                {c.products.map((p) => (
                  <li
                    key={p.id}
                    className="border-b border-line sm:odd:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0"
                  >
                    <Link
                      href={`/products/${c.slug}/${p.slug}`}
                      className="flex h-full flex-col gap-1 px-5 py-4 transition-colors hover:bg-surface"
                    >
                      <span className="font-semibold text-ink">{p.name}</span>
                      <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.8125rem] text-muted">
                        {p.casNo ? <span className="font-data">CAS {p.casNo}</span> : null}
                        {p.grade ? <span>{p.grade}</span> : null}
                        {p.packSizes?.length ? <span>{p.packSizes.slice(0, 2).join(", ")}</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line p-8">
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
