"use client";

import { useEffect } from "react";

/**
 * Loads analytics ONLY after the visitor agrees (Phase 8 todo 18, Phase 29 todo 11).
 * The cookie banner (Phase 9) dispatches: window.dispatchEvent(new CustomEvent("gi:consent", { detail: { analytics: true } }))
 * and sets window.__giConsent for later page loads. IDs come from admin settings and are validated
 * as plain IDs (G-XXXX / clarity id) — no script text can be pasted into the admin.
 */
export function AnalyticsLoader({ ga4Id, clarityId }) {
  useEffect(() => {
    if (!ga4Id && !clarityId) return undefined;
    let loaded = false;

    const load = () => {
      if (loaded) return;
      loaded = true;
      if (ga4Id && /^G-[A-Z0-9]{4,12}$/.test(ga4Id)) {
        const s = document.createElement("script");
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag() {
          window.dataLayer.push(arguments);
        };
        window.gtag("js", new Date());
        window.gtag("config", ga4Id, { anonymize_ip: true });
      }
      if (clarityId && /^[a-z0-9]{6,16}$/.test(clarityId)) {
        const s = document.createElement("script");
        s.async = true;
        s.src = `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`;
        document.head.appendChild(s);
      }
    };

    if (window.__giConsent?.analytics === true) load();
    const onConsent = (e) => e.detail?.analytics === true && load();
    window.addEventListener("gi:consent", onConsent);
    return () => window.removeEventListener("gi:consent", onConsent);
  }, [ga4Id, clarityId]);

  return null;
}
