"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MediaImage } from "@/components/ui/MediaImage";
import { cn } from "@/lib/utils";

/**
 * Filterable photo gallery with a keyboard-friendly viewer (Phase 11 todo 14).
 * Filters are buttons with aria-pressed; the viewer is a native <dialog> (Esc closes, arrows move).
 */
export function GalleryGrid({ items, showFilters }) {
  const categories = [...new Set(items.map((i) => i.category))];
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState(-1);
  const dialogRef = useRef(null);
  const shown = filter === "All" ? items : items.filter((i) => i.category === filter);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open >= 0 && !d.open) d.showModal();
    if (open < 0 && d.open) d.close();
  }, [open]);

  const move = (step) => setOpen((i) => (i + step + shown.length) % shown.length);
  const current = shown[open];

  return (
    <div className="flex flex-col gap-6">
      {showFilters && categories.length > 1 ? (
        <div role="group" aria-label="Filter photos" className="flex flex-wrap gap-2">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={cn(
                "h-9 rounded-btn border px-3.5 text-sm font-semibold transition-colors",
                filter === c
                  ? "border-primary bg-primary text-primary-ink"
                  : "border-line bg-card text-ink hover:border-primary",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-label="Photos">
        {shown.map((item, i) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full overflow-hidden rounded-card border border-line bg-card text-left"
            >
              <MediaImage
                asset={item.media}
                aspect="4:3"
                sizes="(min-width: 1024px) 300px, 50vw"
                className="w-full transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {item.caption ? (
                <span className="block truncate border-t border-line px-3 py-2 text-[0.8125rem] text-muted">
                  {item.caption}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={current?.caption || current?.media.alt || "Photo"}
        onClose={() => setOpen(-1)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          if (e.key === "ArrowLeft") move(-1);
        }}
        onClick={(e) => e.target === dialogRef.current && setOpen(-1)}
        className="m-auto w-[min(1100px,calc(100%-24px))] rounded-card border border-line bg-card p-0"
      >
        {current ? (
          <figure className="flex flex-col">
            <div className="relative bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- full-size view of a library image */}
              <img
                src={current.media.url}
                alt={current.media.alt}
                className="mx-auto max-h-[75vh] w-auto object-contain"
              />
            </div>
            <figcaption className="flex items-center gap-3 border-t border-line px-4 py-3 text-sm">
              <span className="flex-1 text-ink">{current.caption || current.media.alt}</span>
              <span className="font-data text-[0.75rem] text-muted">
                {open + 1} / {shown.length}
              </span>
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous photo"
                className="inline-flex size-9 items-center justify-center rounded-btn border border-line"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Next photo"
                className="inline-flex size-9 items-center justify-center rounded-btn border border-line"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(-1)}
                aria-label="Close"
                className="inline-flex size-9 items-center justify-center rounded-btn border border-line"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </figcaption>
          </figure>
        ) : null}
      </dialog>
    </div>
  );
}
