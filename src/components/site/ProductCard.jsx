import { ArrowRight, FlaskConical } from "lucide-react";
import Link from "next/link";

import { MediaImage } from "@/components/ui/MediaImage";

/**
 * Product card (Design.md §6): name, CAS, grade, pack sizes, MOQ, "View details". No price — prices
 * are quoted on request (Memory.md content rule 4).
 */
export function ProductCard({ product }) {
  const href = `/products/${product.category.slug}/${product.slug}`;
  const facts = [
    product.grade || product.purity
      ? ["Grade", [product.grade, product.purity].filter(Boolean).join(" · ")]
      : null,
    product.packSizes?.length ? ["Packs", product.packSizes.slice(0, 3).join(", ")] : null,
    product.moq ? ["MOQ", product.moq] : null,
  ].filter(Boolean);

  return (
    <article className="lift group relative flex h-full flex-col overflow-hidden surface-card duration-150 motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface">
        {product.image ? (
          <MediaImage
            asset={product.image}
            aspect="16:10"
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full transition-transform duration-500 ease-[var(--ease-standard)] motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="relative h-full bg-[radial-gradient(90%_120%_at_100%_0%,color-mix(in_oklab,var(--c-accent)_22%,transparent),transparent_60%),linear-gradient(160deg,color-mix(in_oklab,var(--c-primary)_10%,var(--c-surface)),var(--c-surface))]">
            <FlaskConical
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 -rotate-12 text-primary/12 transition-transform duration-500 motion-safe:group-hover:-rotate-6"
              strokeWidth={1}
            />
          </div>
        )}
        <span className="absolute bottom-3 left-3 max-w-[80%] truncate rounded-pill bg-[color-mix(in_oklab,var(--c-card)_82%,transparent)] px-3 py-1 text-[0.75rem] font-semibold text-primary shadow-xs backdrop-blur">
          {product.category.name}
        </span>
        {product.casNo ? (
          <span className="absolute top-3 right-3 rounded-pill bg-[color-mix(in_oklab,var(--c-primary)_88%,transparent)] px-2.5 py-1 font-data text-[0.6875rem] font-semibold text-primary-ink">
            CAS {product.casNo}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <h3 className="text-h3 leading-snug">
          <Link href={href} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        {facts.length ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.875rem]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="font-data text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          View details{" "}
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </article>
  );
}
