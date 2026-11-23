"use client";

import { Search } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Input } from "@/components/ui/Field";

/**
 * Pick products by ticking them (industry pages, Phase 15 todo 19). The full product list comes from
 * the server page as a prop; filtering is local.
 * @param {{ products: { id: string, name: string, category: string }[], value: string[], onChange: (ids: string[]) => void, error?: string, disabled?: boolean }} props
 */
export function ProductChecklist({ products, value, onChange, error, disabled }) {
  const [q, setQ] = useState("");
  const id = useId();
  const selected = new Set(value);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(needle))
      : products;
    return [...list].sort((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sort only when the search changes
  }, [products, q]);
  const toggle = (pid) => onChange(selected.has(pid) ? value.filter((v) => v !== pid) : [...value, pid]);

  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="text-label text-ink">Products used in this industry</legend>
      <p className="-mt-1 text-[0.8125rem] text-muted">
        {value.length} selected. They appear on the industry page, and the industry is linked from each
        product page.
      </p>
      <div className="relative max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        />
        <Input
          size="sm"
          type="search"
          aria-label="Filter products"
          placeholder="Filter products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>
      <ul
        id={id}
        className="grid max-h-80 gap-1 overflow-auto rounded-btn bg-surface p-2 shadow-[inset_0_0_0_1px_var(--hairline)] sm:grid-cols-2"
        aria-label="Products"
      >
        {shown.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-surface">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                className="mt-1 size-4 accent-[var(--c-primary)]"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-ink">{p.name}</span>
                <span className="text-[0.75rem] text-muted">{p.category}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error ? <p className="text-[0.8125rem] text-error">{error}</p> : null}
    </fieldset>
  );
}
