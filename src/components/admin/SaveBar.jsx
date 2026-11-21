"use client";

import { Eye, History, Save, Send } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { cn } from "@/lib/utils";

/**
 * Sticky save bar (Phase 6 todo 07, 08, 18).
 * - Save draft / Publish / Preview / History actions (each optional).
 * - Ctrl+S (Cmd+S on Mac) saves a draft — or publishes when there is no draft action.
 * - Shows the unsaved / saved state and guards navigation while there are unsaved changes.
 *
 * @param {{
 *   dirty: boolean, saving?: boolean, status?: 'DRAFT'|'PUBLISHED'|'ARCHIVED'|null, savedAt?: Date|null,
 *   onSaveDraft?: () => void, onPublish?: () => void, onPreview?: () => void, onHistory?: () => void,
 *   canPublish?: boolean, publishLabel?: string, saveLabel?: string
 * }} props
 */
export function SaveBar({
  dirty,
  saving = false,
  status = null,
  savedAt = null,
  onSaveDraft,
  onPublish,
  onPreview,
  onHistory,
  canPublish = true,
  publishLabel = "Publish",
  saveLabel = "Save draft",
}) {
  useUnsavedChanges(dirty && !saving);
  const handlers = useRef({ onSaveDraft, onPublish, dirty, saving, canPublish });
  useEffect(() => {
    handlers.current = { onSaveDraft, onPublish, dirty, saving, canPublish };
  });

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const h = handlers.current;
        if (h.saving) return;
        if (h.onSaveDraft) h.onSaveDraft();
        else if (h.onPublish && h.canPublish) h.onPublish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const statusTone = { PUBLISHED: "success", DRAFT: "neutral", ARCHIVED: "error" }[status] ?? "neutral";
  const time = savedAt ? new Intl.DateTimeFormat("en-IN", { timeStyle: "short" }).format(savedAt) : null;

  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-line bg-card/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 text-sm" aria-live="polite">
          {status ? <Badge tone={statusTone}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge> : null}
          <span className={cn("truncate", dirty ? "font-semibold text-accent-text" : "text-muted")}>
            {saving ? "Saving..." : dirty ? "Unsaved changes" : time ? `All changes saved at ${time}` : "No changes"}
          </span>
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-data text-[0.6875rem] text-muted md:inline">Ctrl + S</kbd>
        </div>
        <div className="flex flex-wrap gap-2">
          {onHistory ? (
            <Button variant="ghost" size="sm" onClick={onHistory}>
              <History aria-hidden="true" /> History
            </Button>
          ) : null}
          {onPreview ? (
            <Button variant="ghost" size="sm" onClick={onPreview}>
              <Eye aria-hidden="true" /> Preview
            </Button>
          ) : null}
          {onSaveDraft ? (
            <Button variant="secondary" size="sm" onClick={onSaveDraft} disabled={!dirty || saving} loading={saving && !onPublish}>
              <Save aria-hidden="true" /> {saveLabel}
            </Button>
          ) : null}
          {onPublish ? (
            <Button size="sm" onClick={onPublish} disabled={saving || !canPublish} loading={saving} title={!canPublish ? "Your role cannot publish" : undefined}>
              <Send aria-hidden="true" /> {publishLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
