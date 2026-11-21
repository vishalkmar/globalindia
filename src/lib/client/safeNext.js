/**
 * Open-redirect guard for ?next= values: only same-site admin paths are allowed.
 * Rejects absolute URLs, protocol-relative "//evil.com", backslash tricks and anything outside /admin.
 */
export function safeNext(value, fallback = "/admin") {
  if (typeof value !== "string" || value.length > 300) return fallback;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/admin")) return fallback;
  if (decoded.startsWith("//") || decoded.includes("\\") || /[\u0000-\u001f]/.test(decoded)) return fallback;
  if (/^\/admin\/(login|verify|forgot|reset|confirm-email)\b/.test(decoded)) return fallback;
  return decoded;
}
