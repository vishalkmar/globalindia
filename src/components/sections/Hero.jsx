import { ArrowRight, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import Link from "@/components/ui/SmartLink";
import { getMedia } from "@/lib/site-data";
import { STOCK } from "@/lib/stockImages";

/**
 * Home hero: full-bleed dark band over a warehouse photo (the admin's uploaded photo wins),
 * headline + actions on the left, a glass "in stock now" card on the right.
 */
export async function Hero({ data, ctx }) {
  const media = data.imageId ? await getMedia(data.imageId) : null;
  const photo = media ? { src: media.url, alt: media.alt ?? "" } : STOCK.heroWarehouse;
  const buttons = [data.primaryCta, data.secondaryCta].filter((b) => b?.text && b?.href);

  return (
    <section
      className="relative isolate overflow-hidden bg-band text-band-ink"
      aria-labelledby="hero-title"
    >
      {/* Photo + colour wash: readable text on the left, the photo shows through on the right. */}
      <Image
        src={photo.src}
        alt=""
        fill
        priority
        sizes="100vw"
        quality={70}
        className="-z-20 object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--c-band)_0%,color-mix(in_oklab,var(--c-band)_92%,transparent)_38%,color-mix(in_oklab,var(--c-band)_62%,transparent)_70%,color-mix(in_oklab,var(--c-band)_35%,transparent)_100%)] max-lg:bg-[color-mix(in_oklab,var(--c-band)_86%,transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_0%_100%,color-mix(in_oklab,var(--c-accent)_22%,transparent),transparent_60%)]"
      />

      <div className="container-site hero-in grid items-center gap-12 pt-14 pb-24 md:pt-20 md:pb-32 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:pt-24 lg:pb-36">
        <div className="flex flex-col items-start gap-6">
          {data.eyebrow ? (
            <p className="text-eyebrow">
              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" />
              {data.eyebrow}
            </p>
          ) : null}
          <h1 id="hero-title" className="max-w-[18ch] text-display text-band-ink">
            {data.title}
          </h1>
          {data.subtitle ? (
            <p className="max-w-xl text-lead text-[color-mix(in_oklab,var(--c-band-ink)_78%,transparent)]">
              {data.subtitle}
            </p>
          ) : null}
          {buttons.length ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {buttons.map((b, i) => (
                <Button
                  key={b.href + i}
                  href={b.href}
                  size="lg"
                  variant={i === 0 ? "onBand" : "onBandOutline"}
                >
                  {b.text}
                  {i === 0 ? <ArrowRight aria-hidden="true" /> : null}
                </Button>
              ))}
            </div>
          ) : null}
          {data.trustFacts.length ? (
            <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-5" data-testid="trust-facts">
              {data.trustFacts.map((f) => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <dt className="order-2 text-sm text-[color-mix(in_oklab,var(--c-band-ink)_68%,transparent)]">
                    {f.label}
                  </dt>
                  <dd className="order-1 font-display text-[2rem] leading-none font-extrabold tracking-tight text-band-ink">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {data.highlights.length ? (
          <div className="relative hidden sm:block">
            <aside
              aria-label="In stock now"
              className="relative overflow-hidden rounded-[calc(var(--r-card)+4px)] bg-[color-mix(in_oklab,var(--c-card)_96%,transparent)] text-ink shadow-[0_30px_80px_-20px_rgb(0_0_0/0.55)] ring-1 ring-white/20"
            >
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                <p className="flex items-center gap-2 text-sm font-bold text-primary">
                  <span aria-hidden="true" className="relative flex size-2">
                    <span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  <PackageCheck aria-hidden="true" className="size-4" strokeWidth={2} /> In stock now
                </p>
                <span className="rounded-pill bg-surface px-2.5 py-1 text-xs font-semibold text-muted">
                  {ctx.business.address.city}
                </span>
              </div>
              <ul className="flex flex-col gap-1 px-3">
                {data.highlights.map((h) => (
                  <li
                    key={h.name}
                    className="flex items-center justify-between gap-3 rounded-btn px-2 py-2.5 transition-colors duration-200 hover:bg-surface"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-ink">{h.name}</span>
                      <span className="truncate text-[0.8125rem] text-muted">{h.detail}</span>
                    </span>
                    <span className="shrink-0 rounded-pill bg-[color-mix(in_oklab,var(--c-success)_12%,transparent)] px-2 py-0.5 text-[0.6875rem] font-bold text-success">
                      Ready
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between gap-3 bg-surface px-5 py-3.5">
                <span className="flex items-center gap-3 text-xs font-semibold text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Truck aria-hidden="true" className="size-3.5" /> Same-week dispatch
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck aria-hidden="true" className="size-3.5" /> COA with batch
                  </span>
                </span>
                <Link
                  href="/contact#quote"
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                  Get price <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}
