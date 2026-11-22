"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Dialog";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";

import { EmptyState } from "./EmptyState";

const when = (d) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));

/**
 * Revision drawer (Phase 6 todo 12). Restoring loads the snapshot into the form via onRestore(data);
 * nothing is written until the user saves.
 */
export function RevisionHistory({ open, onClose, entity, entityId, onRestore }) {
  const [state, setState] = useState({ loading: true, rows: [], error: "" });
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!open || !entityId) return undefined;
    let live = true;
    adminJson(
      `/api/admin/revisions?entity=${encodeURIComponent(entity)}&entityId=${encodeURIComponent(entityId)}`,
    ).then((res) => {
      if (!live) return;
      setState(
        res.ok
          ? { loading: false, rows: res.data.revisions, error: "" }
          : { loading: false, rows: [], error: res.data?.error ?? "Could not load history." },
      );
    });
    return () => {
      live = false;
    };
  }, [open, entity, entityId]);

  async function restore(id) {
    setBusyId(id);
    const res = await adminJson(`/api/admin/revisions/${id}`);
    setBusyId(null);
    if (res.ok) {
      onRestore(res.data.revision.data);
      onClose();
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="History">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          The last 20 saved versions. Restoring puts that version in the editor; save to keep it.
        </p>
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.loading ? (
          <Skeleton lines={5} />
        ) : state.rows.length === 0 ? (
          <EmptyState
            title="No saved versions yet"
            text="A version is stored every time this item is saved."
          />
        ) : (
          <ol className="flex flex-col divide-y divide-line rounded-card border border-line">
            {state.rows.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {when(r.createdAt)}{" "}
                    {i === 0 ? <span className="font-normal text-muted">(latest)</span> : null}
                  </p>
                  <p className="truncate text-[0.8125rem] text-muted">
                    {r.author}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => restore(r.id)}
                  loading={busyId === r.id}
                  disabled={i === 0}
                >
                  <RotateCcw aria-hidden="true" /> Restore
                </Button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Drawer>
  );
}
