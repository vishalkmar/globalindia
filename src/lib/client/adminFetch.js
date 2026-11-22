"use client";

/**
 * Admin API client (Phase 4 todo 13).
 * - Cookies only (credentials: same-origin); tokens are httpOnly and never touched by JavaScript.
 * - On 401 it calls POST /api/auth/refresh ONCE (single-flight, so parallel requests share one rotation —
 *   two parallel rotations would look like token reuse and end the session) and retries the request.
 * - If refresh fails, the browser goes to the login page with a safe relative `next`.
 */

let refreshing = null;

export function refreshSession() {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: "{}",
      cache: "no-store",
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        setTimeout(() => {
          refreshing = null;
        }, 0);
      });
  }
  return refreshing;
}

/* CSRF token (Phase 18): fetched once, kept in memory only, refreshed after a "csrf" 403 (e.g. login rotated it). */
let csrf = null;
export function csrfToken(fresh = false) {
  if (fresh || !csrf) {
    csrf = fetch("/api/auth/csrf", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => d.token ?? "")
      .catch(() => "");
  }
  return csrf;
}
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

async function isCsrfFailure(res) {
  if (res.status !== 403) return false;
  try {
    return (await res.clone().json())?.code === "csrf";
  } catch {
    return false;
  }
}

export function goToLogin() {
  const here = window.location.pathname + window.location.search;
  const next = here.startsWith("/admin") && !here.startsWith("/admin/login") ? here : "/admin";
  // Full reload on purpose: drops every piece of in-memory admin state when the session is gone.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/admin/login?next=${encodeURIComponent(next)}`);
}

/**
 * @param {string} url same-origin path, e.g. "/api/admin/products"
 * @param {RequestInit & { json?: any, noRedirect?: boolean }} [options]
 */
export async function adminFetch(url, options = {}) {
  if (!url.startsWith("/")) throw new Error("adminFetch only calls same-origin paths");
  const { json: body, noRedirect, headers, ...rest } = options;
  const init = {
    credentials: "same-origin",
    cache: "no-store",
    ...rest,
    headers: {
      accept: "application/json",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const unsafe = UNSAFE.has((init.method ?? "GET").toUpperCase());
  if (unsafe) init.headers["x-csrf-token"] = await csrfToken();

  let res = await fetch(url, init);
  if (unsafe && (await isCsrfFailure(res))) {
    init.headers["x-csrf-token"] = await csrfToken(true);
    res = await fetch(url, init);
  }
  if (res.status === 401 && !url.startsWith("/api/auth/")) {
    if (await refreshSession()) res = await fetch(url, init);
    else if (!noRedirect) goToLogin();
  }
  return res;
}

/** adminFetch + parse JSON. Returns { ok, status, data }. */
export async function adminJson(url, options) {
  const res = await adminFetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok && data?.ok !== false, status: res.status, data };
}
