"use client";

import { FileText, ImagePlus, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { cn, formatBytes } from "@/lib/utils";

/**
 * FileDrop — local file picker + drag and drop, with client-side type/size checks.
 * Client checks are only for user feedback; the server re-validates everything (Phase 7 / 19).
 *
 * @param {{
 *  accept?: string[],          // MIME types, e.g. ["image/jpeg","image/png","application/pdf"]
 *  maxBytes?: number,          // per file
 *  maxFiles?: number,
 *  multiple?: boolean,
 *  onFiles?: (files: File[]) => void,
 *  label?: string, hint?: string, disabled?: boolean, className?: string
 * }} props
 */
export function FileDrop({
  accept = ["image/jpeg", "image/png", "image/webp", "image/avif"],
  maxBytes = 5 * 1024 * 1024,
  maxFiles = 20,
  multiple = true,
  onFiles,
  label = "Drop files here or choose from your computer",
  hint,
  disabled = false,
  className,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState([]);
  const [picked, setPicked] = useState([]);
  const hintId = useId();

  const typeLabel = accept
    .map((t) => (t === "application/pdf" ? "PDF" : t.split("/")[1]?.toUpperCase()))
    .filter(Boolean)
    .join(", ");

  function handle(list) {
    const files = Array.from(list ?? []);
    const nextErrors = [];
    const ok = [];
    if (files.length > maxFiles) nextErrors.push(`Choose up to ${maxFiles} files at a time.`);
    for (const file of files.slice(0, maxFiles)) {
      if (!accept.includes(file.type))
        nextErrors.push(`${file.name}: file type not allowed (${typeLabel} only).`);
      else if (file.size > maxBytes)
        nextErrors.push(
          `${file.name}: ${formatBytes(file.size)} is over the ${formatBytes(maxBytes)} limit.`,
        );
      else ok.push(file);
    }
    setErrors(nextErrors);
    setPicked(ok);
    if (ok.length) onFiles?.(ok);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-describedby={hintId}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handle(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border border-dashed px-6 py-10 text-center",
          "border-[color-mix(in_oklab,var(--c-line)_30%,var(--c-muted))] bg-surface transition-colors duration-150",
          "hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          dragging && "border-primary bg-[color-mix(in_oklab,var(--c-primary)_6%,var(--c-surface))]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="inline-flex size-11 items-center justify-center rounded-btn border border-line bg-card text-primary">
          <Upload aria-hidden="true" className="size-5" strokeWidth={1.5} />
        </span>
        <span className="text-[0.9375rem] font-semibold text-ink">{label}</span>
        <span id={hintId} className="text-sm text-muted">
          {hint ??
            `${typeLabel} up to ${formatBytes(maxBytes)} each${multiple ? `, max ${maxFiles} files` : ""}`}
        </span>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept={accept.join(",")}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {errors.length ? (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-error">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}

      {picked.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-card">
          {picked.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              {file.type === "application/pdf" ? (
                <FileText aria-hidden="true" className="size-4 text-muted" strokeWidth={1.5} />
              ) : (
                <ImagePlus aria-hidden="true" className="size-4 text-muted" strokeWidth={1.5} />
              )}
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-data text-muted">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="rounded p-1 text-muted hover:text-ink"
                aria-label={`Remove ${file.name}`}
                onClick={() => setPicked((p) => p.filter((_, idx) => idx !== i))}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
