"use client";

import { CornerDownLeft, FolderTree, LoaderCircle, Package, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Product and category search overlay (Phase 9 todo 07). Opens with the search button, Ctrl+K or "/".
 * Arrow keys move through results, Enter opens, Esc closes. Results come from /api/public/search
 * (rate-limited, published items only).
 */
export function SearchDialog({ open, onClose }) {
  const router = useRouter();
  const ref = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();
  const [q, setQ] = useState("");
  const [state, setState] = useState({ loading: false, results: [], error: "", searched: "" });
  const [active, setActive] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return undefined;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const res = await fetch(`/api/public/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
          headers: { accept: "application/json" },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search is not available right now.");
        const results = [
          ...data.categories.map((c) => ({ ...c, kind: "category" })),
          ...data.products.map((p) => ({ ...p, kind: "product" })),
        ];
        setState({ loading: false, results, error: "", searched: term });
        setActive(0);
      } catch (err) {
        if (err.name !== "AbortError")
          setState({ loading: false, results: [], error: err.message, searched: term });
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const results = q.trim().length >= 2 ? state.results : [];

  function onKeyDown(e) {
    // In a search field the browser uses Esc to clear the text; here one Esc should close the dialog.
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      onClose();
      router.push(results[active].href);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-label="Search products"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="mx-auto mt-[10vh] w-[calc(100%-24px)] max-w-2xl rounded-card border border-line bg-card p-0 text-ink"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search aria-hidden="true" className="size-5 text-muted" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
          aria-label="Search products by name, CAS number or category"
          placeholder="Search products, CAS number or category"
          value={q}
          maxLength={80}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
        {state.loading ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-muted" />
        ) : null}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="inline-flex size-8 items-center justify-center rounded-btn text-muted hover:bg-surface hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-2">
        {q.trim().length < 2 ? (
          <p className="px-3 py-6 text-sm text-muted">
            Type at least two letters, e.g. &ldquo;glycerine&rdquo;, &ldquo;SLES&rdquo; or
            &ldquo;8012-95-1&rdquo;.
          </p>
        ) : state.error ? (
          <p className="px-3 py-6 text-sm text-error">{state.error}</p>
        ) : results.length === 0 && !state.loading && state.searched === q.trim() ? (
          <div className="flex flex-col gap-2 px-3 py-6 text-sm">
            <p className="font-semibold">Nothing found for &ldquo;{state.searched}&rdquo;.</p>
            <p className="text-muted">
              We stock more than the website lists. Tell us what you need and we will check.
            </p>
            <Link
              href={`/contact?product=${encodeURIComponent(state.searched)}#quote`}
              onClick={onClose}
              className="font-semibold text-primary underline underline-offset-4"
            >
              Ask for &ldquo;{state.searched}&rdquo;
            </Link>
          </div>
        ) : (
          <ul id={listId} role="listbox" aria-label="Search results" className="flex flex-col">
            {results.map((r, i) => {
              const Icon = r.kind === "category" ? FolderTree : Package;
              return (
                <li
                  key={`${r.kind}-${r.href}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                >
                  <Link
                    href={r.href}
                    onClick={onClose}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex items-center gap-3 rounded-btn px-3 py-2.5",
                      i === active ? "bg-surface" : "",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" strokeWidth={1.5} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{r.name}</span>
                      <span className="block truncate text-[0.8125rem] text-muted">
                        {r.kind === "category"
                          ? `Category · ${r.count} products`
                          : [r.category, r.casNo ? `CAS ${r.casNo}` : null, r.grade]
                              .filter(Boolean)
                              .join(" · ")}
                      </span>
                    </span>
                    {i === active ? (
                      <CornerDownLeft aria-hidden="true" className="size-4 text-muted" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[0.75rem] text-muted">
        <span>Up and down arrows to move, Enter to open</span>
        <span>Esc to close</span>
      </div>
    </dialog>
  );
}
