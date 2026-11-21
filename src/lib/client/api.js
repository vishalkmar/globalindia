"use client";

/**
 * Minimal JSON POST for the public sign-in steps (no session yet, so no refresh logic).
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export async function postJson(url, body = {}) {
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok && data?.ok !== false, status: res.status, data: data ?? {} };
  } catch {
    return { ok: false, status: 0, data: { error: "Network problem. Check your connection and try again." } };
  }
}
