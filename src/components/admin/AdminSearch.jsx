"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Dialog } from "@/components/ui/Dialog";
import { adminJson } from "@/lib/client/adminFetch";
import { cn } from "@/lib/utils";

/**
 * Global admin search (Phase 16 todo 02): Ctrl/Cmd+K or the header button. Arrow keys move through
 * results, Enter opens one. Results are limited to what the signed-in role may read.
 */
export function AdminSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (term.length < 2) return undefined;
    let live = true;
    const t = setTimeout(() => {
      setBusy(true);
      adminJson(`/api/admin/search?q=${encodeURIComponent(term)}`).then((r) => {
        if (!live) return;
        setBusy(false);
        setGroups(r.ok ? r.data.groups : []);
        setActive(0);
      });
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, open]);

  const flat = q.trim().length >= 2 ? groups.flatMap((g) => g.items) : [];
  function go(item) {
    setOpen(false);
    setQ("");
    setGroups([]);
    router.push(item.href);
  }

  let index = -1;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-btn border border-line px-3 text-sm text-muted hover:border-primary hover:text-ink"
        aria-label="Search the admin (Ctrl+K)"
      >
        <Search aria-hidden="true" className="size-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded border border-line px-1.5 font-data text-[0.6875rem] md:inline">
          Ctrl K
        </kbd>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Search the admin" size="lg">
        <div className="flex flex-col gap-4">
          <input
            ref={inputRef}
            autoFocus
            type="search"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={listId}
            aria-activedescendant={flat.length ? `${listId}-${active}` : undefined}
            aria-label="Search products, pages, enquiries, media and more"
            placeholder="Product, CAS number, page, customer, file…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown")
                (e.preventDefault(), setActive((a) => Math.min(a + 1, flat.length - 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
              if (e.key === "Enter" && flat[active]) (e.preventDefault(), go(flat[active]));
            }}
            className="h-12 w-full rounded-btn border border-line bg-card px-4 text-[0.9375rem] text-ink focus-visible:border-primary"
          />
          <div
            id={listId}
            role="listbox"
            aria-label="Results"
            className="flex max-h-[60vh] flex-col gap-4 overflow-auto"
          >
            {q.trim().length < 2 ? (
              <p className="text-sm text-muted">Type at least two letters.</p>
            ) : busy && !groups.length ? (
              <p className="text-sm text-muted">Searching…</p>
            ) : groups.length ? (
              groups.map((g) => (
                <div key={g.group} role="group" aria-label={g.group} className="flex flex-col gap-1">
                  <p className="text-[0.75rem] font-bold tracking-wide text-muted uppercase">{g.group}</p>
                  {g.items.map((item) => {
                    index += 1;
                    const i = index;
                    return (
                      <div
                        key={item.href + item.title}
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={i === active}
                        tabIndex={-1}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(item)}
                        className={cn(
                          "flex cursor-pointer items-baseline justify-between gap-3 rounded-btn px-3 py-2",
                          i === active ? "bg-surface" : "",
                        )}
                      >
                        <span className="truncate font-medium text-ink">{item.title}</span>
                        {item.meta ? (
                          <span className="shrink-0 text-[0.75rem] text-muted">{item.meta}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">Nothing found for “{q.trim()}”.</p>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
