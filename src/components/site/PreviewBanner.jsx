"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

/** Shown at the top of a page in preview mode, with a way out. */
export function PreviewBanner({ isDraft }) {
  const [busy, setBusy] = useState(false);
  return (
    <div
      role="status"
      className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-3 bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-white"
      data-testid="preview-banner"
    >
      <Eye aria-hidden="true" className="size-4" />
      {isDraft
        ? "Preview of unpublished changes. Visitors still see the published page."
        : "Preview mode. There are no unpublished changes on this page."}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch("/api/admin/preview", { method: "DELETE", credentials: "same-origin" }).catch(
            () => null,
          );
          window.location.reload();
        }}
        className="rounded border border-white/60 px-2 py-0.5 hover:bg-white/10"
      >
        Exit preview
      </button>
    </div>
  );
}
