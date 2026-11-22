"use client";

import { csrfToken } from "@/lib/client/adminFetch";

async function send(url, body, token) {
  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json", accept: "application/json", "x-csrf-token": token },
    body: JSON.stringify(body),
  });
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Minimal JSON POST for the public sign-in steps (no session yet, so no refresh logic).
 * Sends the CSRF token (Phase 18); if the server says it expired, fetches a fresh one and retries once.
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export async function postJson(url, body = {}) {
  try {
    let res = await send(url, body, await csrfToken());
    let data = await readJson(res);
    if (res.status === 403 && data?.code === "csrf") {
      res = await send(url, body, await csrfToken(true));
      data = await readJson(res);
    }
    return { ok: res.ok && data?.ok !== false, status: res.status, data: data ?? {} };
  } catch {
    return { ok: false, status: 0, data: { error: "Network problem. Check your connection and try again." } };
  }
}
