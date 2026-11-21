import { ChevronRight, House } from "lucide-react";
import Link from "next/link";

import { siteUrl } from "@/lib/env";
import { jsonLd } from "@/lib/seo/jsonLd";
import { cn } from "@/lib/utils";

/**
 * Breadcrumb with BreadcrumbList structured data (Phase 9 todo 08).
 * Pages pass their real trail — never a guessed or generic one (the reference site's mistake).
 * @param {{ items: { label: string, href?: string }[], className?: string, onBand?: boolean }} props
 *   The last item is the current page (no href needed).
 */
export function Breadcrumb({ items, className, onBand = false }) {
  const trail = [{ label: "Home", href: "/" }, ...items];
  const base = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href && i < trail.length - 1 ? { item: `${base}${item.href}` } : {}),
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={cn("flex flex-wrap items-center gap-1.5 text-[0.8125rem]", onBand ? "text-band-ink/75" : "text-muted")}>
        {trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? <ChevronRight aria-hidden="true" className="size-3.5 opacity-60" /> : null}
              {last ? (
                <span aria-current="page" className={cn("font-semibold", onBand ? "text-band-ink" : "text-ink")}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="inline-flex items-center gap-1 hover:underline">
                  {i === 0 ? <House aria-hidden="true" className="size-3.5" /> : null}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
    </nav>
  );
}
