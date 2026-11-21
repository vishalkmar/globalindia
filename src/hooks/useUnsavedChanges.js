"use client";

import { useEffect } from "react";

const MESSAGE = "You have unsaved changes. Leave this page and lose them?";

/**
 * Unsaved-changes guard (Phase 6 todo 08).
 * - Browser close / reload / typed URL: native beforeunload prompt.
 * - Clicks on in-app links (Next.js <Link> renders <a>): confirm before navigating.
 * - Browser back button: confirm via a popstate trap.
 * @param {boolean} dirty
 */
export function useUnsavedChanges(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const trap = () => {
      if (!window.confirm(MESSAGE)) window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", trap);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", trap);
    };
  }, [dirty]);
}
