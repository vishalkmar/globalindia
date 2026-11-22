"use client";

import { useEffect, useRef, useState } from "react";

/** True when the user asked the OS to reduce motion. */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Count-up as an enhancement only.
 * The server renders the real final value (no "0+" like the reference site). After hydration, if the
 * number is still below the fold, it is reset to 0 and counts up when it scrolls into view.
 *
 * @param {number} target final value (from the server/DB)
 * @param {{ duration?: number }} [options]
 * @returns {{ ref: import('react').RefObject<any>, value: number }}
 */
export function useCountUp(target, { duration = 1400 } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(target);

  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      !Number.isFinite(target) ||
      prefersReducedMotion() ||
      typeof IntersectionObserver === "undefined"
    )
      return undefined;
    if (el.getBoundingClientRect().top < window.innerHeight) return undefined; // visible already: keep real value

    let frame = 0;
    // Reset happens in a microtask-free callback to avoid a visible flash above the fold.
    const resetId = requestAnimationFrame(() => setValue(0));
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) ** 3;
          setValue(Math.round(target * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      cancelAnimationFrame(resetId);
      cancelAnimationFrame(frame);
      observer.disconnect();
      setValue(target);
    };
  }, [target, duration]);

  return { ref, value };
}
