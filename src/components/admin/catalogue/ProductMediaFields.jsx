"use client";

import { FileText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AssetThumb } from "@/components/admin/media/MediaBrowser";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { SortableList } from "@/components/admin/SortableList";
import { Button } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Field";
import { adminJson } from "@/lib/client/adminFetch";
import { formatBytes } from "@/lib/utils";

/** Loads library assets by id once and keeps them for display (ids are what the form stores). */
function useAssets(ids) {
  const [assets, setAssets] = useState({});
  const missing = ids.filter((id) => !(id in assets));
  const key = missing.join();
  useEffect(() => {
    if (!key) return undefined;
    let live = true;
    Promise.all(
      key
        .split(",")
        .map((id) => adminJson(`/api/admin/media/${id}`).then((r) => [id, r.ok ? r.data.asset : null])),
    ).then((pairs) => {
      if (live) setAssets((a) => ({ ...a, ...Object.fromEntries(pairs) }));
    });
    return () => {
      live = false;
    };
  }, [key]);
  return [assets, (asset) => setAssets((a) => ({ ...a, [asset.id]: asset }))];
}

/** Product gallery (Phase 12 todo 13): up to 12 images, drag to reorder. */
export function ProductGalleryField({ value, onChange, errors, disabled }) {
  const [assets, remember] = useAssets(value);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-label text-ink">Gallery images</legend>
      <p className="-mt-1 text-[0.8125rem] text-muted">
        Extra photos shown on the product page: packs, labels, the material itself. Drag to reorder.
      </p>
      {value.length ? (
        <SortableList
          items={value.map((id) => ({ id, label: assets[id]?.alt || "Image" }))}
          disabled={disabled}
          onReorder={(next) => onChange(next.map((n) => n.id))}
          renderItem={(row) => {
            const a = assets[row.id];
            const index = value.indexOf(row.id);
            const err = errors[`gallery.${index}`];
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  {a ? (
                    <AssetThumb asset={a} className="aspect-[4/3] w-20 rounded" />
                  ) : (
                    <span className="aspect-[4/3] w-20 rounded bg-surface" />
                  )}
                  <p className="min-w-0 flex-1 truncate text-sm">
                    {a === null ? "Deleted image" : (a?.alt ?? "Loading…")}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove gallery image ${index + 1}`}
                    onClick={() => onChange(value.filter((id) => id !== row.id))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                {err ? <p className="text-[0.8125rem] text-error">{err}</p> : null}
              </div>
            );
          }}
        />
      ) : null}
      {!disabled && value.length < 12 ? (
        <MediaPicker
          key={value.length}
          label="Add a gallery image"
          folder="products"
          value={null}
          onChange={(asset) => {
            if (!asset || value.includes(asset.id)) return;
            remember(asset);
            onChange([...value, asset.id]);
          }}
        />
      ) : null}
      {errors.gallery ? <p className="text-[0.8125rem] text-error">{errors.gallery}</p> : null}
    </fieldset>
  );
}

const DOC_TYPES = [
  { value: "COA", label: "COA (certificate of analysis)" },
  { value: "SDS", label: "SDS / MSDS (safety data sheet)" },
  { value: "TDS", label: "TDS (technical data sheet)" },
  { value: "BROCHURE", label: "Brochure" },
  { value: "OTHER", label: "Other" },
];

/** Product documents (Phase 12 todo 10): PDFs from the library with type, label and visibility. */
export function ProductDocumentsField({ value, onChange, errors, disabled }) {
  const [assets, remember] = useAssets(value.map((d) => d.mediaId));
  const update = (i, patch) => onChange(value.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-label text-ink">Documents</legend>
      <p className="-mt-1 text-[0.8125rem] text-muted">
        COA, SDS and TDS as PDF. “Public” documents can be downloaded from the product page; others are sent
        to buyers on request through a link that expires.
      </p>
      {value.map((d, i) => {
        const a = assets[d.mediaId];
        return (
          <div
            key={d.mediaId}
            className="flex flex-col gap-2 rounded-btn bg-surface shadow-[inset_0_0_0_1px_var(--hairline)] p-3"
            data-testid="document-row"
          >
            <div className="flex items-center gap-3">
              <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {a === null ? "Deleted file" : (a?.originalName ?? "Loading…")}
                {a ? <span className="ml-2 font-normal text-muted">{formatBytes(a.bytes)}</span> : null}
              </p>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Remove document ${i + 1}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <Select
                aria-label={`Type of document ${i + 1}`}
                value={d.type}
                onChange={(e) => update(i, { type: e.target.value })}
                className="h-9 text-sm"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Input
                size="sm"
                aria-label={`Label for document ${i + 1}`}
                placeholder="Label, e.g. Batch 2411"
                maxLength={80}
                value={d.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <Checkbox
                label="Public"
                checked={d.isPublic}
                onChange={(e) => update(i, { isPublic: e.target.checked })}
                className="text-sm"
              />
            </div>
            {errors[`documents.${i}.mediaId`] ? (
              <p className="text-[0.8125rem] text-error">{errors[`documents.${i}.mediaId`]}</p>
            ) : null}
          </div>
        );
      })}
      {!disabled && value.length < 10 ? (
        <MediaPicker
          key={value.length}
          label="Attach a PDF"
          accept="pdf"
          folder="documents"
          value={null}
          onChange={(asset) => {
            if (!asset || value.some((d) => d.mediaId === asset.id)) return;
            remember(asset);
            onChange([...value, { mediaId: asset.id, type: "COA", label: "", isPublic: false }]);
          }}
        />
      ) : null}
    </fieldset>
  );
}
