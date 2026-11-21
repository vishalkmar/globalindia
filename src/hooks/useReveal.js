"use client";

import { useEffect, useRef } from "react";

/** True when the user asked the OS to reduce motion. */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fade-up 12 px when the element first scrolls into view (once).
 * Content is visible by default (server HTML, no-JS, crawlers). On hydration, only elements that are
 * still below the fold are hidden and then revealed — so nothing above the fold ever flickers.
 * Does nothing when reduced motion is requested.
 *
 * @param {{ threshold?: number, rootMargin?: string, delay?: number }} [options]
 */
export function useReveal({ threshold = 0.15, rootMargin = "0px 0px -8% 0px", delay = 0 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return undefined;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return undefined; // already on screen: leave as is

    el.classList.add("reveal-pending");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        if (delay) el.style.transitionDelay = `${delay}ms`;
        el.classList.add("reveal-in");
        el.classList.remove("reveal-pending");
        observer.disconnect();
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, delay]);

  return ref;
}
