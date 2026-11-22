import "server-only";

import { NextResponse } from "next/server";

import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Shared helpers for Route Handlers: JSON responses with no-store, generic errors,
 * size-limited JSON body parsing with Zod, and a same-origin check for state-changing requests.
 */

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" };

export function json(data, init = {}) {
  return NextResponse.json(data, { ...init, headers: { ...NO_STORE, ...(init.headers ?? {}) } });
}

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const errorMessages = {
  400: "The request could not be processed.",
  401: "Please sign in again.",
  403: "You do not have permission to do that.",
  404: "Not found.",
  413: "The request is too large.",
  415: "Unsupported content type.",
  429: "Too many attempts. Please wait and try again.",
  500: "Something went wrong. Please try again.",
};

export function errorResponse(status, message = errorMessages[status] ?? errorMessages[500], extra = {}) {
  const headers = {};
  if (status === 429 && extra.retryAfter) headers["Retry-After"] = String(extra.retryAfter);
  return json({ ok: false, error: message, ...(extra.body ?? {}) }, { status, headers });
}

/**
 * Wrap a route handler: HttpError -> generic response, anything else -> 500 without stack traces.
 * @param {(req: Request, ctx: any) => Promise<Response>} handler
 */
export function route(handler) {
  return async (req, ctx) => {
    try {
      // CSRF token on every state-changing admin/auth request (Phase 18). Loaded lazily: public routes never pay for it.
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const csrf = await import("@/lib/security/csrf");
        if (csrf.needsCsrf(req)) await csrf.verifyCsrf(req);
      }
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.status, err.message, err.extra);
      logger.error("route.unhandled", { path: new URL(req.url).pathname, err });
      return errorResponse(500);
    }
  };
}

const MAX_JSON_BYTES = 16 * 1024;

/**
 * Parse a JSON body safely: content-type must be application/json, size is capped,
 * prototype-pollution keys are rejected, then the Zod schema validates (unknown keys stripped/rejected by schema).
 */
export async function readJson(req, schema, { maxBytes = MAX_JSON_BYTES } = {}) {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) throw new HttpError(415, errorMessages[415]);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new HttpError(413, errorMessages[413]);
  const text = await req.text();
  if (Buffer.byteLength(text) > maxBytes) throw new HttpError(413, errorMessages[413]);
  let data;
  try {
    data = JSON.parse(text, (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") throw new Error("bad key");
      return value;
    });
  } catch {
    throw new HttpError(400, errorMessages[400]);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new HttpError(400, "Please check the highlighted fields.", {
      body: { fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])) },
    });
  }
  return parsed.data;
}

/**
 * Same-origin check for POST/PUT/PATCH/DELETE (first CSRF layer; Phase 18 adds the token).
 * Accepts requests whose Origin matches our site, or Sec-Fetch-Site: same-origin.
 */
export function assertSameOrigin(req) {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  const allowed = new Set([siteUrl(), new URL(req.url).origin]);
  if (origin) {
    if (!allowed.has(origin)) throw new HttpError(403, errorMessages[403]);
    return;
  }
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
    throw new HttpError(403, errorMessages[403]);
  if (!fetchSite && process.env.NODE_ENV === "production") throw new HttpError(403, errorMessages[403]);
}

/** Read one cookie from a request (NextRequest or a plain Request, e.g. in tests). */
export function cookieValue(req, name) {
  const fromNext = req.cookies?.get?.(name)?.value;
  if (fromNext !== undefined) return fromNext;
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}
