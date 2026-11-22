"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * Cloudflare Turnstile widget (Phase 14 todo 07). Renders nothing when no site key is configured
 * (local development); the server then decides whether that is allowed.
 * @param {{ onToken: (token: string) => void, resetKey?: number }} props
 */
export function Turnstile({ onToken, resetKey = 0 }) {
  const ref = useRef(null);
  const widget = useRef(null);
  const [ready, setReady] = useState(typeof window !== "undefined" && Boolean(window.turnstile));

  useEffect(() => {
    if (!SITE_KEY || !ready || !ref.current || !window.turnstile) return undefined;
    widget.current = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      callback: (t) => onToken(t),
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
      theme: "light",
      size: "flexible",
    });
    return () => {
      if (widget.current) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [ready, onToken, resetKey]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onReady={() => setReady(true)}
      />
      <div ref={ref} className="min-h-[65px]" aria-label="Security check" />
    </>
  );
}

/**
 * Honeypot (todo 08): a field people never see or reach with the keyboard. Bots that fill every input
 * fill this one too, and the server quietly drops their submission.
 */
export function Honeypot({ value, onChange }) {
  const id = useId();
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label htmlFor={id}>Leave this field empty</label>
      <input
        id={id}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
