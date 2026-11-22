"use client";

import { Cookie } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";

/** Tell the analytics loader (and anything else) what the visitor chose. */
function announce(analytics) {
  window.__giConsent = { analytics };
  window.dispatchEvent(new CustomEvent("gi:consent", { detail: { analytics } }));
}

/** One lookup per page load, shared by every mount (the banner survives client navigations anyway). */
let storedChoice = null;
function readStoredChoice() {
  storedChoice ??= fetch("/api/public/consent", { credentials: "same-origin", cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { choice: null }))
    .then((d) => (d.choice === "granted" || d.choice === "denied" ? d.choice : null))
    .catch(() => null);
  return storedChoice;
}

/**
 * Cookie consent (Phase 9 todo 15). Only necessary cookies until the visitor says yes.
 * The choice lives in an httpOnly cookie set by /api/public/consent; the banner asks the same endpoint
 * for it after load, so no script touches cookies and every public page stays fully static.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    readStoredChoice().then((choice) => {
      if (!alive) return;
      if (choice) announce(choice === "granted");
      else setOpen(true);
    });
    // A click on "Cookie settings" that happened before this component finished loading is not lost.
    if (window.__giCookieSettingsRequested) {
      window.__giCookieSettingsRequested = false;
      requestAnimationFrame(() => setOpen(true));
    }
    const reopen = () => {
      window.__giCookieSettingsRequested = false;
      setOpen(true);
    };
    window.addEventListener("gi:cookie-settings", reopen);
    return () => {
      alive = false;
      window.removeEventListener("gi:cookie-settings", reopen);
    };
  }, []);

  async function choose(analytics) {
    setBusy(true);
    await fetch("/api/public/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ analytics }),
      credentials: "same-origin",
    }).catch(() => null);
    storedChoice = Promise.resolve(analytics ? "granted" : "denied");
    setBusy(false);
    setOpen(false);
    announce(analytics);
  }

  if (!open) return null;
  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-card border border-line bg-card p-5 shadow-[0_18px_48px_-24px_rgb(0_0_0/0.45)] md:inset-x-6 md:bottom-6"
      data-testid="cookie-consent"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex flex-1 gap-3">
          <Cookie aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.5} />
          <div className="flex flex-col gap-1 text-sm">
            <h2 id="cookie-title" className="font-semibold text-ink">
              Cookies on this site
            </h2>
            <p className="text-muted">
              We use necessary cookies to run the site. With your permission we also count visits to see which
              products people look for. Nothing is sold or shared for advertising.{" "}
              <Link href="/legal/cookies" className="font-semibold text-primary underline underline-offset-2">
                Cookie policy
              </Link>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => choose(false)} disabled={busy}>
            Necessary only
          </Button>
          <Button size="sm" onClick={() => choose(true)} disabled={busy}>
            Allow analytics
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Footer link that reopens the banner. */
export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.__giCookieSettingsRequested = true;
        window.dispatchEvent(new Event("gi:cookie-settings"));
      }}
      className="hover:text-band-ink hover:underline"
    >
      Cookie settings
    </button>
  );
}
