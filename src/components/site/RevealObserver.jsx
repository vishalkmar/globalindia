"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * One observer for the whole site instead of a client component per card (keeps hydration cheap).
 * Any element with data-reveal fades up once when it scrolls into view. Elements already on screen,
 * and everything when reduced motion is on, are left untouched (no flicker, content visible without JS).
 * Optional per-element delay: style="--reveal-delay: 120ms".
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("reveal-in");
          e.target.classList.remove("reveal-pending");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    const fold = window.innerHeight * 0.92;
    for (const el of document.querySelectorAll("[data-reveal]:not(.reveal-in)")) {
      if (el.getBoundingClientRect().top < fold) continue;
      el.classList.add("reveal-pending");
      io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
