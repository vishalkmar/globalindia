import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

import { MediaImage } from "@/components/ui/MediaImage";
import Link from "@/components/ui/SmartLink";
import { cropFor, imageForProduct } from "@/lib/stockImages";

/**
 * Product card (Design.md §6): photo, name, grade, pack sizes, MOQ. No price — prices are quoted on
 * request (Memory.md content rule 4). Without an uploaded photo the family's default photo is used.
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
  const stock = product.image ? null : imageForProduct(product);
  const crop = cropFor(product.slug);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[calc(var(--r-card)+2px)] bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-sm)] transition-[box-shadow,transform] duration-300 ease-[var(--ease-standard)] hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-primary)_25%,transparent),var(--sh-lg)] motion-safe:hover:-translate-y-1">
      <div className="relative aspect-[16/9] overflow-hidden bg-surface">
        {product.image ? (
          <MediaImage
            asset={product.image}
            aspect="16:9"
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full transition-transform duration-700 ease-[var(--ease-standard)] motion-safe:group-hover:scale-105"
          />
        ) : (
          <Image
            src={stock.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
            style={{ objectPosition: crop.objectPosition, transformOrigin: crop.objectPosition, scale: crop.scale }}
            className="object-cover transition-[scale] duration-700 ease-[var(--ease-standard)]"
          />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgb(0_0_0/0.45))]"
        />
        <span className="absolute bottom-3 left-3 max-w-[75%] truncate rounded-pill bg-white/92 px-3 py-1 text-xs font-bold text-primary shadow-sm">
          {product.category.name}
        </span>
        {product.casNo ? (
          <span className="absolute top-3 left-3 rounded-pill bg-[color-mix(in_oklab,var(--c-band)_85%,transparent)] px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-white tabular-nums">
            CAS {product.casNo}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <h3 className="text-[1.125rem] leading-snug font-bold tracking-tight text-ink">
          <Link href={href} className="after:absolute after:inset-0 group-hover:text-primary">
            {product.name}
          </Link>
        </h3>
        {facts.length ? (
          <dl className="flex flex-col gap-2 text-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-dashed border-hairline pb-2 last:border-0 last:pb-0">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="truncate text-right font-semibold text-ink tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="text-sm font-bold text-primary">View details</span>
          <span
            aria-hidden="true"
            className="inline-flex size-9 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--c-primary)_10%,transparent)] text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-ink"
          >
            <ArrowUpRight className="size-[18px]" strokeWidth={2} />
          </span>
        </div>
      </div>
    </article>
  );
}
