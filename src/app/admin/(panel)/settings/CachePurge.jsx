"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { adminJson } from "@/lib/client/adminFetch";

/** "Refresh the website" (Phase 16 todo 09). */
export function CachePurge() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function purge() {
    setBusy(true);
    const r = await adminJson("/api/admin/cache", { method: "POST" });
    setBusy(false);
    if (!r.ok) return toast.error(r.data?.error ?? "Could not refresh.");
    toast.success("Done. Every page is rebuilt with fresh data on its next visit.");
  }
  return (
    <section
      className="flex flex-col items-start gap-3 rounded-card border border-line bg-card p-5"
      aria-labelledby="cache-title"
    >
      <h2 id="cache-title" className="font-semibold text-ink">
        Refresh the whole website
      </h2>
      <p className="max-w-2xl text-sm text-muted">
        Every save already refreshes the pages it affects. Use this only if something on the website still
        looks out of date.
      </p>
      <Button variant="secondary" size="sm" onClick={purge} loading={busy}>
        <RefreshCw aria-hidden="true" /> Refresh cached pages
      </Button>
    </section>
  );
}
