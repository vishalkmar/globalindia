import Image from "next/image";

import { Breadcrumb } from "@/components/site/Breadcrumb";
import { cn } from "@/lib/utils";

/**
 * Inner-page hero: dark band over a photo, the same family as the home hero.
 * @param {{ photo: { src: string }, crumbs: object[], eyebrow?: string, title: string, titleId?: string,
 *   lead?: string, children?: React.ReactNode, aside?: React.ReactNode, compact?: boolean }} props
 */
export function PhotoHero({ photo, crumbs, eyebrow, title, titleId = "page-title", lead, children, aside, compact }) {
  return (
    <section className="relative isolate overflow-hidden bg-band text-band-ink" aria-labelledby={titleId}>
      <Image src={photo.src} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--c-band)_0%,color-mix(in_oklab,var(--c-band)_90%,transparent)_45%,color-mix(in_oklab,var(--c-band)_55%,transparent)_100%)] max-lg:bg-[color-mix(in_oklab,var(--c-band)_88%,transparent)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_80%_at_0%_100%,color-mix(in_oklab,var(--c-accent)_20%,transparent),transparent_60%)]"
      />
      <div
        className={cn(
          "container-site hero-in grid items-center gap-10",
          compact ? "py-12 md:py-16" : "py-14 md:py-20",
          aside ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14" : "",
        )}
      >
        <div className="flex flex-col items-start gap-5">
          <Breadcrumb items={crumbs} onBand />
          {eyebrow ? (
            <p className="text-eyebrow">
              <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" />
              {eyebrow}
            </p>
          ) : null}
          <h1 id={titleId} className="max-w-[20ch] text-display text-band-ink">
            {title}
          </h1>
          {lead ? (
            <p className="max-w-2xl text-lead text-[color-mix(in_oklab,var(--c-band-ink)_78%,transparent)]">{lead}</p>
          ) : null}
          {children}
        </div>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </section>
  );
}
