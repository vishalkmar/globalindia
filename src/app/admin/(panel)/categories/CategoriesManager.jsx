"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/admin/catalogue/StatusBadge";
import { SortableList } from "@/components/admin/SortableList";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { Alert, Skeleton } from "@/components/ui/Static";
import { FAMILIES } from "@/lib/catalogue/families";
import { adminJson } from "@/lib/client/adminFetch";

/** One family's categories; the new order is saved with one click after dragging. */
function FamilyGroup({ family, rows, canEdit, onSaved }) {
  const toast = useToast();
  const [order, setOrder] = useState(rows);
  const [saving, setSaving] = useState(false);
  const changed = order.map((r) => r.id).join() !== rows.map((r) => r.id).join();

  async function save() {
    setSaving(true);
    const res = await adminJson("/api/admin/categories/reorder", {
      method: "PUT",
      json: { ids: order.map((r) => r.id) },
    });
    setSaving(false);
    if (!res.ok) return toast.error(res.data?.error ?? "Could not save the order.");
    toast.success(`Order saved for ${family.name}.`);
    onSaved();
  }

  return (
    <section
      aria-labelledby={`fam-${family.key}`}
      className="flex flex-col gap-3 rounded-card border border-line bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`fam-${family.key}`} className="font-display text-lg text-primary">
          {family.name} <span className="font-sans text-sm text-muted">({rows.length})</span>
        </h2>
        {changed ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOrder(rows)}>
              Undo
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              Save order
            </Button>
          </div>
        ) : null}
      </div>
      {rows.length ? (
        <SortableList
          items={order.map((r) => ({ ...r, label: r.name }))}
          disabled={!canEdit}
          onReorder={(next) => setOrder(next.map((n) => order.find((r) => r.id === n.id)))}
          renderItem={(row) => (
            <div className="flex flex-wrap items-center gap-3" data-testid="category-row">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{row.name}</p>
                <p className="truncate font-data text-[0.75rem] text-muted">/products/{row.slug}</p>
              </div>
              <span className="text-sm text-muted">
                {row.productCount === 1 ? "1 product" : `${row.productCount} products`}
              </span>
              <StatusBadge status={row.status} />
              <Link
                href={`/admin/categories/${row.id}`}
                className="inline-flex size-9 items-center justify-center rounded-btn border border-line text-ink hover:border-primary"
                aria-label={`Edit ${row.name}`}
              >
                <Pencil aria-hidden="true" className="size-4" />
              </Link>
            </div>
          )}
        />
      ) : (
        <p className="text-sm text-muted">No categories in this family yet.</p>
      )}
    </section>
  );
}

/** Categories list (Phase 12 todo 03): grouped by family, drag to reorder, counts and status. */
export function CategoriesManager({ canEdit }) {
  const [state, setState] = useState({ rows: null, error: "" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    adminJson("/api/admin/categories").then((res) => {
      if (!live) return;
      setState(
        res.ok
          ? { rows: res.data.categories, error: "" }
          : { rows: null, error: res.data?.error ?? "Could not load categories." },
      );
    });
    return () => {
      live = false;
    };
  }, [reload]);

  const byFamily = useMemo(
    () =>
      Object.fromEntries(FAMILIES.map((f) => [f.key, (state.rows ?? []).filter((r) => r.family === f.key)])),
    [state.rows],
  );

  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (!state.rows) return <Skeleton className="h-96" />;
  return (
    <div className="flex flex-col gap-5">
      {FAMILIES.map((f) => (
        <FamilyGroup
          key={`${f.key}-${reload}`}
          family={f}
          rows={byFamily[f.key]}
          canEdit={canEdit}
          onSaved={() => setReload((n) => n + 1)}
        />
      ))}
    </div>
  );
}
