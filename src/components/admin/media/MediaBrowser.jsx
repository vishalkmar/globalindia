"use client";

import { ChevronLeft, ChevronRight, FileText, Search, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Checkbox, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { MEDIA_FOLDERS } from "@/lib/media/constants";
import { cn, formatBytes } from "@/lib/utils";

import { EmptyState } from "../EmptyState";

/** Small thumbnail; plain <img> so it works for every storage driver without layout work. */
export function AssetThumb({ asset, className }) {
  if (asset.type === "PDF") {
    return (
      <div
        className={cn("flex flex-col items-center justify-center gap-1.5 bg-surface text-muted", className)}
      >
        <FileText aria-hidden="true" className="size-8" strokeWidth={1.25} />
        <span className="font-data text-[0.6875rem] uppercase">PDF</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail, any driver
    <img
      src={
        asset.url.startsWith("https://res.cloudinary.com/")
          ? asset.url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_fill,w_320,h_240/")
          : asset.url
      }
      alt={asset.alt || ""}
      loading="lazy"
      className={cn("bg-surface object-cover", className)}
      style={
        asset.focalX != null ? { objectPosition: `${asset.focalX * 100}% ${asset.focalY * 100}%` } : undefined
      }
    />
  );
}

/**
 * Library grid with search, type, folder and "missing alt" filters (Phase 7 todo 10).
 * @param {{ accept?: 'image'|'pdf'|'any', onOpen?: (asset)=>void, selectedId?: string, reloadKey?: number }} props
 */
export function MediaBrowser({ accept = "any", onOpen, selectedId, reloadKey = 0 }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState(accept === "image" ? "IMAGE" : accept === "pdf" ? "PDF" : "");
  const [folder, setFolder] = useState("");
  const [missingAlt, setMissingAlt] = useState(false);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: "24" });
    if (debounced) p.set("q", debounced);
    if (type) p.set("type", type);
    if (folder) p.set("folder", folder);
    if (missingAlt) p.set("missingAlt", "1");
    return p.toString();
  }, [page, debounced, type, folder, missingAlt]);

  useEffect(() => {
    let live = true;
    adminJson(`/api/admin/media?${query}`).then((res) => {
      if (live)
        setState(
          res.ok
            ? { loading: false, data: res.data, error: "" }
            : { loading: false, data: null, error: res.data?.error ?? "Could not load files." },
        );
    });
    return () => {
      live = false;
    };
  }, [query, reloadKey]);

  const rows = state.data?.rows ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            size="sm"
            type="search"
            aria-label="Search files"
            placeholder="Search by name or alt text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        {accept === "any" ? (
          <div className="lg:w-40">
            <Select
              aria-label="File type"
              value={type}
              onChange={(e) => (setType(e.target.value), setPage(1))}
              className="h-10 text-sm"
            >
              <option value="">All types</option>
              <option value="IMAGE">Images</option>
              <option value="PDF">PDFs</option>
            </Select>
          </div>
        ) : null}
        <div className="lg:w-56">
          <Select
            aria-label="Folder"
            value={folder}
            onChange={(e) => (setFolder(e.target.value), setPage(1))}
            className="h-10 text-sm"
          >
            <option value="">All folders</option>
            {MEDIA_FOLDERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        {accept !== "pdf" ? (
          <Checkbox
            label="Missing alt text"
            checked={missingAlt}
            onChange={(e) => (setMissingAlt(e.target.checked), setPage(1))}
          />
        ) : null}
      </div>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      {state.loading && !state.data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton aspect-[4/3]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="surface-card">
          <EmptyState
            title="No files here"
            text={
              debounced || folder || missingAlt
                ? "Nothing matches these filters."
                : "Upload images and PDFs above. They can then be used anywhere on the site."
            }
          />
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
          aria-label="Files"
        >
          {rows.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpen?.(a)}
                aria-pressed={selectedId ? selectedId === a.id : undefined}
                className={cn(
                  "group flex w-full flex-col overflow-hidden rounded-card border bg-card text-left transition-colors",
                  selectedId === a.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-line hover:border-primary",
                )}
              >
                <AssetThumb asset={a} className="aspect-[4/3] w-full" />
                <span className="flex flex-col gap-0.5 border-t border-line px-2.5 py-2">
                  <span className="truncate text-[0.8125rem] font-medium">
                    {a.originalName || a.alt || "Untitled"}
                  </span>
                  <span className="flex items-center justify-between gap-2 text-[0.75rem] text-muted">
                    <span className="font-data">{formatBytes(a.bytes)}</span>
                    {a.needsAlt ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-accent-text">
                        <TriangleAlert aria-hidden="true" className="size-3" /> No alt
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {state.data && state.data.pages > 1 ? (
        <div className="flex items-center justify-end gap-1 text-sm text-muted">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex size-9 items-center justify-center rounded-btn bg-card text-ink shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)] transition-[color,box-shadow] hover:text-primary hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-primary)_35%,transparent),var(--sh-sm)] disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <span className="px-2">
            Page {state.data.page} of {state.data.pages}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= state.data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex size-9 items-center justify-center rounded-btn bg-card text-ink shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)] transition-[color,box-shadow] hover:text-primary hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-primary)_35%,transparent),var(--sh-sm)] disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
