"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Sticky "on this page" bar for the long product page (Phase 13 todo 05). Plain anchor links that work
 * without JavaScript; after hydration the section being read is marked with aria-current and its link
 * is scrolled into view inside the bar on small screens.
 * @param {{ items: { id: string, label: string }[] }} props
 */
export function ProductAnchorNav({ items }) {
  const [active, setActive] = useState(items[0]?.id ?? null);
  const listRef = useRef(null);

  // The active section is the last one whose top has passed under the header and this bar.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = items[0]?.id ?? null;
      for (const i of items) {
        const el = document.getElementById(i.id);
        if (el && el.getBoundingClientRect().top <= 160) current = i.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  useEffect(() => {
    const link = listRef.current?.querySelector(`[data-id="${active}"]`);
    if (!link || !listRef.current) return;
    const list = listRef.current;
    const left = link.offsetLeft - list.clientWidth / 2 + link.clientWidth / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label="On this page"
      className="sticky top-[65px] z-30 border-b border-line bg-bg/95 backdrop-blur-sm"
    >
      <div className="container-site">
        <ul ref={listRef} className="-mx-1 no-scrollbar flex gap-1 overflow-x-auto py-2">
          {items.map((i) => (
            <li key={i.id} className="shrink-0">
              <a
                href={`#${i.id}`}
                data-id={i.id}
                aria-current={active === i.id ? "true" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-btn px-3 text-sm font-semibold whitespace-nowrap transition-colors",
                  active === i.id ? "bg-primary text-primary-ink" : "text-ink hover:bg-surface",
                )}
              >
                {i.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
