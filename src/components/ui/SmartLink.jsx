"use client";

import NextLink from "next/link";
import { useState } from "react";

/**
 * Drop-in for next/link on the public site (instant navigation).
 * - Before intent: the route's shared App Shell is prefetched as usual ("auto").
 * - On hover, keyboard focus or the start of a touch: the full page for THIS link is prefetched
 *   (prefetch={true}). Our pages are prerendered, so that prefetch is served from the static cache,
 *   and the click renders the finished page at once instead of waiting for the server.
 * - An explicit `prefetch` prop (e.g. the main menu's `true`) always wins.
 * See node_modules/next/dist/docs/01-app/02-guides/prefetching.md (hover-triggered prefetch).
 */
export default function SmartLink({ prefetch, onMouseEnter, onFocus, onTouchStart, ...props }) {
  const [intent, setIntent] = useState(false);
  const mark = (handler) => (event) => {
    if (!intent) setIntent(true);
    handler?.(event);
  };
  return (
    <NextLink
      prefetch={prefetch ?? (intent ? true : "auto")}
      onMouseEnter={mark(onMouseEnter)}
      onFocus={mark(onFocus)}
      onTouchStart={mark(onTouchStart)}
      {...props}
    />
  );
}
