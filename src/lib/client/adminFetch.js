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

async function code403(res) {
  if (res.status !== 403) return null;
  try {
    return (await res.clone().json())?.code ?? null;
  } catch {
    return null;
  }
}
const isCsrfFailure = async (res) => (await code403(res)) === "csrf";

/* Step-up (Phase 25 todo 10): the admin shell registers a function that asks for the password and
   resolves true once /api/auth/step-up accepted it. Only one prompt at a time. */
let stepUpHandler = null;
let stepUpPending = null;
export function setStepUpHandler(fn) {
  stepUpHandler = fn;
}
function askStepUp() {
  if (!stepUpHandler) return Promise.resolve(false);
  stepUpPending ??= Promise.resolve(stepUpHandler()).finally(() => {
    stepUpPending = null;
  });
  return stepUpPending;
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
 * @param {RequestInit & { json?: any, noRedirect?: boolean, background?: boolean }} [options]
 *   background: a poll the person did not ask for (e.g. the enquiry bell). It never refreshes the
 *   session or redirects, so an unattended tab still reaches the idle timeout (Phase 25 todo 12).
 */
export async function adminFetch(url, options = {}) {
  if (!url.startsWith("/")) throw new Error("adminFetch only calls same-origin paths");
  const { json: body, noRedirect, background, headers, ...rest } = options;
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
  if (res.status === 401 && !background && !url.startsWith("/api/auth/")) {
    if (await refreshSession()) res = await fetch(url, init);
    else if (!noRedirect) goToLogin();
  }
  if (!background && (await code403(res)) === "step_up" && (await askStepUp())) res = await fetch(url, init);
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
