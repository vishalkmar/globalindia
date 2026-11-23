"use client";

import { FileText, ImagePlus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { formatBytes } from "@/lib/utils";

import { AssetThumb, MediaBrowser } from "./MediaBrowser";
import { MediaUploader } from "./MediaUploader";

/**
 * The one image/PDF field used by every admin form (Phase 7 todo 12).
 * Choose from the library or upload (file, drag-drop, link) inside the same dialog.
 * An image without alt text cannot be chosen until alt text is written (todo 11).
 *
 * @param {{ label: string, value: object|null, onChange: (asset|null)=>void, accept?: 'image'|'pdf', folder?: string, hint?: string, error?: string }} props
 */
export function MediaPicker({ label, value, onChange, accept = "image", folder = "library", hint, error }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [alt, setAlt] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  function select(asset) {
    setSelected(asset);
    setAlt(asset.alt);
    setProblem("");
  }

  async function confirm() {
    let asset = selected;
    if (asset.type === "IMAGE" && !alt.trim()) return setProblem("Write alt text for this image first.");
    if (asset.type === "IMAGE" && alt !== asset.alt) {
      setBusy(true);
      const res = await adminJson(`/api/admin/media/${asset.id}`, { method: "PATCH", json: { alt } });
      setBusy(false);
      if (!res.ok) return setProblem(res.data?.error ?? "Could not save the alt text.");
      asset = res.data.asset;
    }
    onChange(asset);
    setOpen(false);
    setSelected(null);
  }

  const Icon = accept === "pdf" ? FileText : ImagePlus;

  return (
    <Field label={label} hint={hint} error={error}>
      <div className="flex items-center gap-3 rounded-btn bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)] p-2.5">
        {value ? (
          <>
            <AssetThumb asset={value} className="size-16 shrink-0 rounded" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{value.originalName || value.alt || "Selected file"}</p>
              <p className="truncate text-muted">
                {value.type === "IMAGE" ? `Alt: ${value.alt}` : formatBytes(value.bytes)}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              Change
            </Button>
            <Button size="icon" variant="ghost" aria-label={`Remove ${label}`} onClick={() => onChange(null)}>
              <X aria-hidden="true" />
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <Icon aria-hidden="true" /> {accept === "pdf" ? "Choose PDF" : "Choose image"}
          </Button>
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={accept === "pdf" ? "Choose a PDF" : "Choose an image"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={!selected} loading={busy}>
              Use this file
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <MediaUploader
            accept={accept}
            folder={folder}
            compact
            onUploaded={(assets) => {
              setReloadKey((k) => k + 1);
              if (assets[0]) select(assets[0]);
            }}
          />
          {selected ? (
            <div className="flex flex-col gap-3 rounded-card border border-primary bg-[color-mix(in_oklab,var(--c-primary)_4%,var(--c-card))] p-4">
              <p className="text-sm font-semibold">Selected: {selected.originalName || "file"}</p>
              {selected.type === "IMAGE" ? (
                <Field label="Alt text (required)" hint="Describe what the image shows.">
                  <Input
                    value={alt}
                    maxLength={200}
                    onChange={(e) => (setAlt(e.target.value), setProblem(""))}
                  />
                </Field>
              ) : null}
              {problem ? <Alert tone="error">{problem}</Alert> : null}
            </div>
          ) : null}
          <MediaBrowser accept={accept} onOpen={select} selectedId={selected?.id} reloadKey={reloadKey} />
        </div>
      </Dialog>
    </Field>
  );
}
