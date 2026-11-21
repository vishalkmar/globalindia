"use client";

import { CircleAlert, CircleCheck, FileText, ImagePlus, Link2, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { kindOf, useMediaUpload } from "@/hooks/useMediaUpload";
import { HARD_LIMITS, IMAGE_MIME, MEDIA_FOLDERS, PDF_MIME } from "@/lib/media/constants";
import { cn, formatBytes } from "@/lib/utils";

/**
 * Three ways in (Phase 7 todo 03-05): click to choose files, drag and drop, or paste a link.
 * Every file shows its own progress and result. Client checks are for quick feedback only;
 * the server checks the real bytes again.
 *
 * @param {{ accept?: 'image'|'pdf'|'any', folder?: string, onUploaded?: (assets:any[]) => void, compact?: boolean }} props
 */
export function MediaUploader({ accept = "any", folder: initialFolder = "library", onUploaded, compact = false }) {
  const { uploadFile, uploadFromUrl } = useMediaUpload();
  const [tab, setTab] = useState("computer");
  const [folder, setFolder] = useState(initialFolder);
  const [queue, setQueue] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState("");
  const [urlKind, setUrlKind] = useState(accept === "pdf" ? "pdf" : "image");
  const [urlBusy, setUrlBusy] = useState(false);
  const [urlError, setUrlError] = useState("");
  const inputRef = useRef(null);
  const hintId = useId();

  const mimes = accept === "image" ? IMAGE_MIME : accept === "pdf" ? PDF_MIME : [...IMAGE_MIME, ...PDF_MIME];
  const typeText = accept === "image" ? "JPG, PNG, WEBP or AVIF up to 5 MB" : accept === "pdf" ? "PDF up to 10 MB" : "Images up to 5 MB, PDF up to 10 MB";

  const patch = (key, data) => setQueue((q) => q.map((item) => (item.key === key ? { ...item, ...data } : item)));

  async function handleFiles(list) {
    const files = Array.from(list ?? []).slice(0, HARD_LIMITS.filesPerBatch);
    const items = files.map((file, i) => ({ key: `${Date.now()}-${i}-${file.name}`, file, name: file.name, size: file.size, progress: 0, status: "waiting", error: "" }));
    setQueue((q) => [...items, ...q].slice(0, 40));
    const done = [];
    for (const item of items) {
      const { file } = item;
      const max = kindOf(file) === "pdf" ? HARD_LIMITS.pdfBytes : HARD_LIMITS.imageBytes;
      if (!mimes.includes(file.type)) {
        patch(item.key, { status: "error", error: file.type === "image/svg+xml" ? "SVG files are not accepted." : `Not accepted. Use ${typeText}.` });
        continue;
      }
      if (file.size > max) {
        patch(item.key, { status: "error", error: `${formatBytes(file.size)} is over the ${formatBytes(max)} limit.` });
        continue;
      }
      patch(item.key, { status: "uploading" });
      try {
        const asset = await uploadFile(file, { folder, onProgress: (p) => patch(item.key, { progress: p }) });
        patch(item.key, { status: "done", progress: 100 });
        done.push(asset);
      } catch (err) {
        patch(item.key, { status: "error", error: err.message });
      }
    }
    if (done.length) onUploaded?.(done);
  }

  async function submitUrl(e) {
    e.preventDefault();
    setUrlError("");
    setUrlBusy(true);
    try {
      const asset = await uploadFromUrl(url.trim(), { kind: urlKind, folder });
      setUrl("");
      onUploaded?.([asset]);
    } catch (err) {
      setUrlError(err.message);
    } finally {
      setUrlBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label="Upload method" className="inline-flex rounded-btn border border-line bg-surface p-1">
          {[
            { id: "computer", label: "From computer", icon: Upload },
            { id: "link", label: "From a link", icon: Link2 },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn("inline-flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-sm font-semibold", tab === t.id ? "bg-card text-primary shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-muted hover:text-ink")}
            >
              <t.icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="w-56">
          <Select aria-label="Save to folder" value={folder} onChange={(e) => setFolder(e.target.value)} className="h-9 text-sm">
            {MEDIA_FOLDERS.map((f) => (
              <option key={f.value} value={f.value}>
                Folder: {f.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {tab === "computer" ? (
        <div
          role="button"
          tabIndex={0}
          aria-describedby={hintId}
          data-testid="media-dropzone"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed text-center transition-colors",
            compact ? "px-4 py-6" : "px-6 py-10",
            "border-[color-mix(in_oklab,var(--c-line)_30%,var(--c-muted))] bg-surface hover:border-primary",
            dragging && "border-primary bg-[color-mix(in_oklab,var(--c-primary)_6%,var(--c-surface))]",
          )}
        >
          <span className="inline-flex size-11 items-center justify-center rounded-btn border border-line bg-card text-primary">
            <Upload aria-hidden="true" className="size-5" strokeWidth={1.5} />
          </span>
          <span className="text-[0.9375rem] font-semibold">{dragging ? "Drop to upload" : "Drag files here, or click to choose"}</span>
          <span id={hintId} className="text-sm text-muted">
            {typeText}. Up to {HARD_LIMITS.filesPerBatch} files at once.
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            accept={mimes.join(",")}
            data-testid="media-file-input"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <form onSubmit={submitUrl} noValidate className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Link to an image or PDF" error={urlError} hint="Must start with https://. The server downloads it and checks it like any other upload.">
              <Input type="url" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
            {accept === "any" ? (
              <Field label="Type">
                <Select value={urlKind} onChange={(e) => setUrlKind(e.target.value)}>
                  <option value="image">Image</option>
                  <option value="pdf">PDF</option>
                </Select>
              </Field>
            ) : null}
          </div>
          <div>
            <Button type="submit" variant="secondary" loading={urlBusy} disabled={!/^https:\/\/\S+$/.test(url.trim())}>
              <Link2 aria-hidden="true" /> Fetch and upload
            </Button>
          </div>
        </form>
      )}

      {queue.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-card" aria-label="Uploads" aria-live="polite">
          {queue.map((item) => {
            const Icon = item.file?.type === "application/pdf" ? FileText : ImagePlus;
            return (
              <li key={item.key} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="shrink-0 font-data text-[0.75rem] text-muted">{formatBytes(item.size)}</span>
                  </div>
                  {item.status === "uploading" ? (
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${item.name}`}>
                      <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${item.progress}%` }} />
                    </div>
                  ) : null}
                  {item.status === "error" ? <p className="mt-0.5 text-[0.8125rem] text-error">{item.error}</p> : null}
                </div>
                {item.status === "done" ? <CircleCheck aria-label="Uploaded" className="size-4 shrink-0 text-success" /> : null}
                {item.status === "error" ? <CircleAlert aria-label="Failed" className="size-4 shrink-0 text-error" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
