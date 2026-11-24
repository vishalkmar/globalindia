"use client";

import { Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";

import Link from "@/components/ui/SmartLink";
import { FAMILIES } from "@/lib/catalogue/families";
import { cn } from "@/lib/utils";

// The filtered grid (product cards, photos) loads only when a filter or search is active.
const CatalogueResults = dynamic(() => import("./CatalogueResults"), {
  loading: () => <p className="text-sm text-muted">Loading products…</p>,
});

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
export function CatalogueBrowser({ categories, family = null, children = null }) {
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

      {!deferred && !familyKey && children ? (
        children
      ) : (
        <CatalogueResults shown={shown} query={query} />
      )}
    </div>
  );
}

/** Reads ?family= from the URL (client side, so the page itself stays static). */
export function CatalogueBrowserWithUrl({ categories, children = null }) {
  const family = useSearchParams().get("family");
  return (
    <CatalogueBrowser categories={categories} family={family}>
      {children}
    </CatalogueBrowser>
  );
}
