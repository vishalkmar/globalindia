"use client";

import { Search } from "lucide-react";

/** A search box look-alike that opens the header search overlay (used on the 404 page). */
export function SearchLauncher({ label = "Search products, CAS number or category" }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("gi:open-search"))}
      className="flex h-12 w-full max-w-lg items-center gap-3 rounded-btn border border-line bg-card px-4 text-left text-muted hover:border-primary"
    >
      <Search aria-hidden="true" className="size-5" strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-data text-[0.6875rem] sm:inline">Ctrl K</kbd>
    </button>
  );
}
