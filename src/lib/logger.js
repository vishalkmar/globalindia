import "server-only";

/**
 * Structured logger with redaction (Security.md, Phase 24).
 * - Sensitive keys are replaced with "[redacted]" at any depth.
 * - CR/LF are stripped from strings so user input cannot forge extra log lines (log injection).
 * - Output is plain JSON; nothing is ever evaluated or interpolated (Log4Shell lesson).
 */

const SENSITIVE = /pass(word)?|secret|token|otp|^code$|cookie|authorization|apikey|api_key|totp|recovery|hash|signature|jwt/i;
const MAX_DEPTH = 5;

export function redact(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === "string") return value.replace(/[\r\n]+/g, " ").slice(0, 2000);
  if (typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[depth]";
  if (value instanceof Error) return { name: value.name, message: redact(value.message, depth + 1) };
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

function write(level, event, data) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event: redact(event), ...redact(data ?? {}) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  // eslint-disable-next-line no-console -- this module is the single sanctioned console writer
  else if (process.env.NODE_ENV !== "test") console.info(line);
}

export const logger = {
  info: (event, data) => write("info", event, data),
  warn: (event, data) => write("warn", event, data),
  error: (event, data) => write("error", event, data),
};
