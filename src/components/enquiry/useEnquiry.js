"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const firstError = (issues) => {
  const out = {};
  for (const i of issues) {
    const k = i.path.join(".");
    if (!out[k]) out[k] = i.message;
  }
  return out;
};

/**
 * Shared state for the public enquiry forms: values, field errors, honeypot, form-open time,
 * Turnstile token, submit and redirect to the thank-you page (Phase 14 todos 06-08, 16).
 * @param {import('zod').ZodType} schema   full schema for the form type (same as the server's)
 * @param {object} initial
 */
export function useEnquiry(schema, initial) {
  const router = useRouter();
  const pathname = usePathname();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      if (!Object.keys(e).some((k) => k === name || k.startsWith(`${name}.`))) return e;
      return Object.fromEntries(Object.entries(e).filter(([k]) => k !== name && !k.startsWith(`${name}.`)));
    });
  }, []);

  /** Validate only some fields (for one step of a multi-step form). */
  const check = useCallback(
    (fields) => {
      const r = schema.safeParse({ ...values, website: "", startedAt: 1, turnstileToken: "", source: "" });
      if (r.success) return true;
      const all = firstError(r.error.issues);
      const relevant = fields
        ? Object.fromEntries(
            Object.entries(all).filter(([k]) => fields.some((f) => k === f || k.startsWith(`${f}.`))),
          )
        : all;
      setErrors((e) => ({ ...e, ...relevant }));
      return Object.keys(relevant).length === 0;
    },
    [schema, values],
  );

  async function submit() {
    setFormError("");
    const payload = {
      ...values,
      website: honeypot,
      startedAt: startedAt.current,
      turnstileToken: token,
      source: pathname,
    };
    const r = schema.safeParse(payload);
    if (!r.success) {
      setErrors(firstError(r.error.issues));
      setFormError("Please check the highlighted fields.");
      return false;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(r.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "The form could not be sent. Please call us instead.");
        setResetKey((k) => k + 1); // Turnstile tokens are single use
        setToken("");
        return false;
      }
      const params = new URLSearchParams({ type: values.type.toLowerCase() });
      if (data.reference) params.set("ref", data.reference);
      router.push(`/contact/thank-you?${params}`);
      return true;
    } catch {
      setFormError("No connection. Please check your internet and try again, or call us.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    values,
    set,
    setValues,
    errors,
    formError,
    busy,
    honeypot,
    setHoneypot,
    setToken,
    resetKey,
    check,
    submit,
  };
}
