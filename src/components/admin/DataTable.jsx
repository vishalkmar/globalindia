"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { cn, formatNumber } from "@/lib/utils";

import { EmptyState } from "./EmptyState";

/**
 * Server-driven table (Phase 6 todo 05): search (debounced), filters, sortable columns and pagination
 * all happen on the server via ?q=&sort=&dir=&page=&pageSize=&<filter>=.
 *
 * @param {{
 *   endpoint: string,
 *   columns: { key: string, label: string, sortable?: boolean, render?: (row:any)=>any, className?: string, align?: 'right' }[],
 *   filters?: { key: string, label: string, type?: 'select'|'date', options?: { value: string, label: string }[] }[],
 *   searchPlaceholder?: string,
 *   rowHref?: (row:any) => string | null,
 *   defaultSort?: { sort: string, dir: 'asc'|'desc' },
 *   empty?: { title: string, text?: string, action?: any },
 *   reloadKey?: number,
 *   caption: string,
 * }} props
 */
export function DataTable({
  endpoint,
  columns,
  filters = [],
  searchPlaceholder = "Search",
  rowHref,
  defaultSort,
  empty,
  reloadKey = 0,
  caption,
  onQuery,
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(defaultSort ?? null);
  const [filterValues, setFilterValues] = useState({});
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (debounced) p.set("q", debounced);
    if (sort) {
      p.set("sort", sort.sort);
      p.set("dir", sort.dir);
    }
    for (const [k, v] of Object.entries(filterValues)) if (v) p.set(k, v);
    return p.toString();
  }, [page, debounced, sort, filterValues]);

  // Lets the page build links that follow the current search and filters (e.g. "Export this view").
  useEffect(() => {
    onQuery?.(query);
  }, [query, onQuery]);

  useEffect(() => {
    let live = true;
    adminJson(`${endpoint}?${query}`).then((res) => {
      if (!live) return;
      setState(
        res.ok
          ? { loading: false, error: "", data: res.data }
          : { loading: false, error: res.data?.error ?? "Could not load the list.", data: null },
      );
    });
    return () => {
      live = false;
    };
  }, [endpoint, query, reloadKey]);

  function toggleSort(key) {
    setPage(1);
    setSort((s) =>
      s?.sort === key ? { sort: key, dir: s.dir === "asc" ? "desc" : "asc" } : { sort: key, dir: "asc" },
    );
  }

  const data = state.data;
  const rows = data?.rows ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            size="sm"
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
        {filters.map((f) =>
          f.type === "date" ? (
            <div key={f.key} className="sm:w-44">
              <Input
                size="sm"
                type="date"
                aria-label={f.label}
                title={f.label}
                value={filterValues[f.key] ?? ""}
                onChange={(e) => {
                  setPage(1);
                  setFilterValues((v) => ({ ...v, [f.key]: e.target.value }));
                }}
                className="h-10"
              />
            </div>
          ) : (
            <div key={f.key} className="sm:w-48">
              <Select
                aria-label={f.label}
                value={filterValues[f.key] ?? ""}
                onChange={(e) => {
                  setPage(1);
                  setFilterValues((v) => ({ ...v, [f.key]: e.target.value }));
                }}
                className="h-10 text-sm"
              >
                <option value="">All {f.label.toLowerCase()}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          ),
        )}
      </div>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="overflow-x-auto rounded-card border border-line bg-card">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm" aria-busy={state.loading}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => {
                const active = sort?.sort === c.key;
                const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "px-4 py-3 text-[0.75rem] font-bold tracking-[0.06em] text-muted uppercase",
                      c.align === "right" && "text-right",
                      c.className,
                    )}
                  >
                    {c.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 uppercase hover:text-ink"
                      >
                        {c.label}
                        <Icon aria-hidden="true" className={cn("size-3.5", !active && "opacity-40")} />
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {state.loading && !data
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5">
                        <div className="skeleton h-4" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => {
                  const href = rowHref?.(row);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-line transition-colors last:border-0 hover:bg-surface"
                    >
                      {columns.map((c, ci) => {
                        const content = c.render ? c.render(row) : (row[c.key] ?? "—");
                        return (
                          <td
                            key={c.key}
                            className={cn(
                              "px-4 py-3 align-middle",
                              c.align === "right" && "text-right",
                              c.className,
                            )}
                          >
                            {href && ci === 0 ? (
                              <Link href={href} className="font-semibold text-primary hover:underline">
                                {content}
                              </Link>
                            ) : (
                              content
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {!state.loading && data && rows.length === 0 ? (
          <EmptyState
            title={empty?.title ?? "Nothing here yet"}
            text={
              debounced || Object.values(filterValues).some(Boolean)
                ? "No results match your search or filters."
                : empty?.text
            }
            action={empty?.action}
          />
        ) : null}
      </div>

      {data && data.total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            {formatNumber((data.page - 1) * data.pageSize + 1)}–
            {formatNumber(Math.min(data.page * data.pageSize, data.total))} of {formatNumber(data.total)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              aria-label="Previous page"
              className="inline-flex size-9 items-center justify-center rounded-btn border border-line bg-card text-ink disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <span className="px-2">
              Page {data.page} of {data.pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={data.page >= data.pages}
              aria-label="Next page"
              className="inline-flex size-9 items-center justify-center rounded-btn border border-line bg-card text-ink disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
