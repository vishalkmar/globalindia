"use client";

import { ChevronDown } from "lucide-react";
import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Tabs — WAI-ARIA tabs pattern with roving tabindex.
 * Arrow Left/Right move between tabs, Home/End jump, panels are linked by id.
 * @param {{ tabs: {id:string,label:string,content:import('react').ReactNode}[], defaultTab?: string, onChange?: (id:string)=>void, label: string }} props
 */
export function Tabs({ tabs, defaultTab, onChange, label, className }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const listRef = useRef(null);
  const base = useId().replace(/:/g, "");

  function select(id, focus = false) {
    setActive(id);
    onChange?.(id);
    if (focus) listRef.current?.querySelector(`[data-tab="${id}"]`)?.focus();
  }

  function onKeyDown(e) {
    const idx = tabs.findIndex((t) => t.id === active);
    let next = null;
    if (e.key === "ArrowRight") next = tabs[(idx + 1) % tabs.length];
    if (e.key === "ArrowLeft") next = tabs[(idx - 1 + tabs.length) % tabs.length];
    if (e.key === "Home") next = tabs[0];
    if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      select(next.id, true);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab={tab.id}
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              className={cn(
                "relative -mb-px shrink-0 border-b-2 px-4 py-3 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors",
                selected ? "border-accent text-primary" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="focus-visible:outline-offset-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

/**
 * Accordion — buttons with aria-expanded; height animates with the grid-rows technique
 * (no JS measuring), instantly when reduced motion is on.
 * @param {{ items: {id:string,title:string,content:import('react').ReactNode}[], multiple?: boolean, defaultOpen?: string[] }} props
 */
export function Accordion({ items, multiple = false, defaultOpen = [], headingLevel = 3, className }) {
  const [open, setOpen] = useState(() => new Set(defaultOpen));
  const base = useId().replace(/:/g, "");
  const H = `h${headingLevel}`;

  function toggle(id) {
    setOpen((prev) => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        return (
          <div
            key={item.id}
            className={cn(
              "surface-card px-5 transition-shadow duration-200 md:px-6",
              isOpen && "shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-primary)_22%,transparent),var(--sh-md)]",
            )}
          >
            <H className="m-0">
              <button
                type="button"
                id={`${base}-h-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-p-${item.id}`}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-6 py-4.5 text-left text-[1.0625rem] font-semibold text-ink transition-colors hover:text-primary"
              >
                <span>{item.title}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface transition-colors duration-200",
                    isOpen && "bg-primary text-primary-ink",
                  )}
                >
                  <ChevronDown
                    strokeWidth={2}
                    className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")}
                  />
                </span>
              </button>
            </H>
            <div
              id={`${base}-p-${item.id}`}
              role="region"
              aria-labelledby={`${base}-h-${item.id}`}
              className={cn(
                "grid transition-[grid-template-rows] duration-250 ease-[var(--ease-standard)]",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
              inert={!isOpen || undefined}
            >
              <div className="overflow-hidden">
                <div className="measure pb-5 text-muted">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
