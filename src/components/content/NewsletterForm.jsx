"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Honeypot, Turnstile } from "@/components/enquiry/FormSecurity";
import { Button } from "@/components/ui/Button";

/**
 * Footer newsletter signup (Phase 15 todo 17): email only, double opt-in, same answer for every address.
 * Styled for the dark footer band.
 */
export function NewsletterForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [state, setState] = useState({ status: "idle", message: "" });
  // The security check loads only once someone starts typing, not on every page view.
  const [engaged, setEngaged] = useState(false);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setState({ status: "error", message: "Enter a valid email address." });
    setState({ status: "busy", message: "" });
    try {
      const res = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          website: honeypot,
          startedAt: startedAt.current,
          turnstileToken: token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        return setState({
          status: "error",
          message: data.error ?? "Could not sign you up. Please try again.",
        });
      setState({ status: "done", message: data.message });
      setEmail("");
    } catch {
      setState({ status: "error", message: "No connection. Please try again." });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="relative flex flex-col gap-2" aria-label="Newsletter">
      <label htmlFor={id} className="text-sm font-semibold">
        Monthly price and stock notes
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="email"
          autoComplete="email"
          maxLength={254}
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setEngaged(true)}
          aria-invalid={state.status === "error" || undefined}
          className="h-10 min-w-0 flex-1 rounded-btn border border-[color-mix(in_oklab,var(--c-band-ink)_35%,transparent)] bg-transparent px-3 text-sm text-band-ink placeholder:text-band-ink/55 focus-visible:border-band-ink"
        />
        <Button type="submit" variant="onBand" size="sm" loading={state.status === "busy"} className="h-10">
          Subscribe
        </Button>
      </div>
      <Honeypot value={honeypot} onChange={setHoneypot} />
      {engaged ? <Turnstile onToken={setToken} /> : null}
      <p className="min-h-5 text-[0.8125rem] text-band-ink/75" role="status">
        {state.message || "One email a month at most. Unsubscribe any time."}
      </p>
    </form>
  );
}

/** Message on /newsletter/confirmed after the link in the email is opened. */
export function NewsletterResult() {
  const ok = useSearchParams().get("status") === "ok";
  return ok ? (
    <>
      <CheckCircle2 aria-hidden="true" className="size-10 text-success" strokeWidth={1.5} />
      <h1 className="text-display">You are subscribed.</h1>
      <p className="measure text-lead">
        Thank you. You will get our notes on prices, stock and new products, at most once a month.
      </p>
      <Button href="/products">Browse products</Button>
    </>
  ) : (
    <>
      <CircleAlert aria-hidden="true" className="size-10 text-accent" strokeWidth={1.5} />
      <h1 className="text-display">This link has expired or was already used.</h1>
      <p className="measure text-lead">
        Confirmation links work once and for 7 days. Sign up again from the form at the bottom of any page.
      </p>
      <Button href="/">Go to the home page</Button>
    </>
  );
}
