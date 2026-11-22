"use client";

/**
 * "Add to quote" basket client (Phase 14 todo 15). The basket lives in an httpOnly cookie managed by
 * /api/public/basket (product slugs only); this module just asks the server and tells other components
 * on the page when it changes.
 */

const EVENT = "gi:basket";
let cache = null;

async function call(init) {
  const res = await fetch("/api/public/basket", { credentials: "same-origin", cache: "no-store", ...init });
  if (!res.ok) throw new Error("basket");
  const data = await res.json();
  cache = data.items;
  if (init?.method === "POST") window.dispatchEvent(new CustomEvent(EVENT, { detail: data.items }));
  return data;
}

/** @returns {Promise<string[]>} */
export async function readBasket({ fresh = false } = {}) {
  if (cache && !fresh) return cache;
  return (await call()).items;
}

const post = (body) =>
  call({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

/** @returns {Promise<{ items: string[], full?: boolean }>} */
export const addToBasket = (slug) => post({ action: "add", slug });
export const removeFromBasket = (slug) => post({ action: "remove", slug });
export const clearBasket = () => post({ action: "clear" });

/** Subscribe to basket changes on this page. */
export function onBasketChange(fn) {
  const handler = (e) => fn(e.detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
