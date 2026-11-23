"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

/**
 * Map that loads only when the visitor asks for it (Phase 14 todo 01): no Google request, cookie or
 * script until the click, which keeps the page fast and private.
 * @param {{ embedUrl: string, openUrl: string, address: string }} props
 */
export function MapEmbed({ embedUrl, openUrl, address }) {
  const [show, setShow] = useState(false);
  if (show) {
    return (
      <iframe
        src={embedUrl}
        title={`Map: ${address}`}
        className="aspect-[4/3] w-full surface-card md:aspect-[16/10]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }
  return (
    <div className="map-placeholder relative flex aspect-[4/3] w-full flex-col items-start justify-end gap-4 overflow-hidden surface-card p-6 md:aspect-[16/10] md:p-8">
      <span
        aria-hidden="true"
        className="absolute top-[38%] left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-ink shadow-primary ring-8 ring-[color-mix(in_oklab,var(--c-primary)_14%,transparent)]"
      >
        <MapPin className="size-6" strokeWidth={1.75} />
      </span>
      <p className="max-w-sm text-ink">{address}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={() => setShow(true)}>
          Show map
        </Button>
        <Button href={openUrl} variant="link" size="sm">
          Open in Google Maps
        </Button>
      </div>
      <p className="text-[0.75rem] text-muted">The map is loaded from Google only when you ask for it.</p>
    </div>
  );
}
