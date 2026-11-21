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
    product.casNo ? ["CAS", product.casNo] : null,
    product.grade || product.purity ? ["Grade", [product.grade, product.purity].filter(Boolean).join(" · ")] : null,
    product.packSizes?.length ? ["Packs", product.packSizes.slice(0, 3).join(", ")] : null,
    product.moq ? ["MOQ", product.moq] : null,
  ].filter(Boolean);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-card transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-primary motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-surface">
        {product.image ? (
          <MediaImage asset={product.image} aspect="4:3" sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" className="h-full w-full" />
        ) : (
          <div className="flex h-full flex-col items-start justify-end gap-1 p-5">
            <FlaskConical aria-hidden="true" className="size-6 text-primary/40" strokeWidth={1.25} />
            <span className="font-data text-[0.75rem] text-muted">{product.category.name}</span>
          </div>
        )}
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
          View details <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
