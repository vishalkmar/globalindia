"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";

const TYPE = {
  product: "Product",
  category: "Category",
  post: "Article",
  industry: "Industry",
  page: "Page",
  media: "File",
};
const day = (d) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(d));

/** Trash list with restore and (super admin) delete forever — Phase 16 todo 07. */
export function TrashList({ canDestroy }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    adminJson("/api/admin/trash").then((r) =>
      r.ok ? setItems(r.data.items) : setError(r.data?.error ?? "Could not load the trash."),
    );
  }, []);
  useEffect(() => {
    let live = true;
    adminJson("/api/admin/trash").then((r) => {
      if (!live) return;
      if (r.ok) setItems(r.data.items);
      else setError(r.data?.error ?? "Could not load the trash.");
    });
    return () => {
      live = false;
    };
  }, []);

  async function act(item, method) {
    setBusy(`${item.type}:${item.id}`);
    const r = await adminJson("/api/admin/trash", { method, json: { type: item.type, id: item.id } });
    setBusy(null);
    setConfirm(null);
    if (!r.ok) return toast.error(r.data?.error ?? "Could not do that.");
    toast.success(
      method === "POST"
        ? `Restored as a draft${r.data.slug ? ` at ${r.data.slug}` : ""}.`
        : "Deleted for good.",
    );
    load();
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!items) return <Skeleton className="h-64" />;
  if (!items.length)
    return (
      <EmptyState icon={Trash2} title="The trash is empty" text="Deleted items appear here for 30 days." />
    );

  return (
    <>
      <ul
        className="flex flex-col divide-y divide-line surface-card"
        data-testid="trash"
      >
        {items.map((item) => (
          <li key={`${item.type}:${item.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <Badge tone="neutral">{TYPE[item.type]}</Badge>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">{item.label}</span>
              <span className="block text-[0.8125rem] text-muted">
                Deleted {day(item.deletedAt)} · removed for good on {day(item.purgeAt)}
              </span>
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => act(item, "POST")}
              loading={busy === `${item.type}:${item.id}`}
            >
              <RotateCcw aria-hidden="true" /> Restore
            </Button>
            {canDestroy ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${item.label} for good`}
                onClick={() => setConfirm(item)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Delete for good?"
        description={confirm ? `${confirm.label} will be removed permanently. This cannot be undone.` : ""}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={() => act(confirm, "DELETE")}>Delete for good</Button>
          </>
        }
      />
    </>
  );
}
