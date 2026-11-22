"use client";

import { useEffect } from "react";

import { adminFetch } from "@/lib/client/adminFetch";

/** Phase 25 todo 12: 30 minutes without a click, key press, scroll or touch signs the admin out. */
export const IDLE_MS = 30 * 60 * 1000;
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"];

export function IdleGuard() {
  useEffect(() => {
    let last = Date.now();
    let done = false;
    const mark = () => {
      last = Date.now();
    };
    const check = async () => {
      if (done || Date.now() - last < IDLE_MS) return;
      done = true;
      await adminFetch("/api/auth/logout", { method: "POST", noRedirect: true }).catch(() => null);
      const next = window.location.pathname + window.location.search;
      // Full reload on purpose: nothing from the old screen stays in memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/admin/login?reason=idle&next=${encodeURIComponent(next)}`);
    };
    for (const e of EVENTS) window.addEventListener(e, mark, { passive: true, capture: true });
    const timer = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, mark, { capture: true });
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return null;
}
