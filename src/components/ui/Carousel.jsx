"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

const Chevron = ({ flip }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-5", flip && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/**
 * Lightweight carousel: a native scroll-snap track (swipe, trackpad and keyboard work without JS)
 * plus previous/next buttons. Slides are passed as <li> children, rendered on the server.
 * Kept stateless on purpose (JS budget): at either end a button simply has nothing left to scroll.
 * @param {{ heading?: React.ReactNode, action?: React.ReactNode, label: string, children: React.ReactNode,
 *   trackClassName?: string, className?: string }} props
 */
export function Carousel({ heading, action, label, children, trackClassName, className }) {
  const track = useRef(null);
  const go = (dir) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };
  const btn =
    "inline-flex size-10 items-center justify-center rounded-full bg-card text-ink shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)] transition-colors duration-200 hover:bg-primary hover:text-primary-ink";

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">{heading}</div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <button type="button" className={btn} onClick={() => go(-1)} aria-label={`Previous: ${label}`}>
            <Chevron flip />
          </button>
          <button type="button" className={btn} onClick={() => go(1)} aria-label={`Next: ${label}`}>
            <Chevron />
          </button>
        </div>
      </div>
      <ul
        ref={track}
        aria-label={label}
        className={cn(
          "no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto overscroll-x-contain px-4 pt-1 pb-6 md:-mx-6 md:scroll-px-6 md:px-6",
          trackClassName,
        )}
      >
        {children}
      </ul>
    </div>
  );
}
