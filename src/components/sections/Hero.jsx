import { ArrowRight, PackageCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { MediaImage } from "@/components/ui/MediaImage";
import { getMedia } from "@/lib/site-data";

/**
 * Hero (Phase 10 todo 02). With a photo: photo on the right, LCP-prioritised. Without a photo: a
 * datasheet-style "in stock now" panel — the page never shows a stock or AI-rendered image.
 */
export async function Hero({ data, ctx }) {
  const image = data.imageId ? await getMedia(data.imageId) : null;
  const buttons = [data.primaryCta, data.secondaryCta].filter((b) => b?.text && b?.href);
  return (
    <section className="border-b border-line bg-surface" aria-labelledby="hero-title">
      <div className="container-site grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          {data.eyebrow ? (
            <p className="text-eyebrow">
              <span aria-hidden="true" className="inline-block h-px w-6 bg-accent" />
              {data.eyebrow}
            </p>
          ) : null}
          <h1 id="hero-title" className="measure text-display">
            {data.title}
          </h1>
          {data.subtitle ? <p className="measure text-lead">{data.subtitle}</p> : null}
          {buttons.length ? (
            <div className="flex flex-wrap gap-3 pt-1">
              {buttons.map((b, i) => (
                <Button key={b.href + i} href={b.href} size="lg" variant={i === 0 ? "primary" : "secondary"}>
                  {b.text}
                  {i === 0 ? <ArrowRight aria-hidden="true" /> : null}
                </Button>
              ))}
            </div>
          ) : null}
          {data.trustFacts.length ? (
            <dl
              className="mt-4 grid w-full grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-3"
              data-testid="trust-facts"
            >
              {data.trustFacts.map((f) => (
                <div
                  key={f.label}
                  className="flex flex-col gap-0.5 sm:border-l sm:border-line sm:pl-4 sm:first:border-l-0 sm:first:pl-0"
                >
                  <dt className="order-2 text-small text-muted">{f.label}</dt>
                  <dd className="order-1 font-display text-[1.75rem] leading-none text-primary">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {image ? (
          <div className="relative overflow-hidden rounded-card border border-line">
            <MediaImage
              asset={image}
              aspect="4:5"
              priority
              sizes="(min-width: 1024px) 480px, 100vw"
              className="h-full w-full"
            />
          </div>
        ) : data.highlights.length ? (
          <aside aria-label="In stock now" className="rounded-card border border-line bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <PackageCheck aria-hidden="true" className="size-4" strokeWidth={1.75} /> In stock now
              </p>
              <span className="font-data text-[0.75rem] text-muted">{ctx.business.address.city}</span>
            </div>
            <ul className="divide-y divide-line">
              {data.highlights.map((h) => (
                <li key={h.name} className="flex flex-col gap-0.5 px-5 py-3.5">
                  <span className="font-semibold text-ink">{h.name}</span>
                  <span className="font-data text-[0.8125rem] text-muted">{h.detail}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line bg-surface px-5 py-3.5">
              <Link
                href="/contact#quote"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Ask for today&rsquo;s price <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
