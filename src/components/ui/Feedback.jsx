"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { tones } from "./Static";

/* ---------------- Toast ---------------- */

const ToastContext = createContext(null);

/** Wrap the app (or admin) once. Then call const toast = useToast(); toast.success("Saved"). */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((tone, message, opts = {}) => {
    const id = ++idRef.current;
    setItems((list) => [
      ...list.slice(-3),
      { id, tone, message, title: opts.title, duration: opts.duration ?? 5000 },
    ]);
    return id;
  }, []);

  const api = useMemo(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      info: (m, o) => push("info", m, o),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(380px,calc(100%-32px))] flex-col gap-2"
      >
        {items.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { icon: Icon, cls } = tones[toast.tone];
  useEffect(() => {
    if (!toast.duration) return undefined;
    const timer = setTimeout(onDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-card border px-4 py-3 text-sm shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]",
        "animate-[toast-in_180ms_var(--ease-standard)]",
        cls,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" strokeWidth={1.75} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {toast.title ? <p className="font-semibold">{toast.title}</p> : null}
        <p className="leading-snug">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-1 rounded p-1 text-muted hover:text-ink"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
