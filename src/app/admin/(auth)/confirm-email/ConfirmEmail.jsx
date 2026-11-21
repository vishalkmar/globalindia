"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "@/components/admin/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Static";
import { postJson } from "@/lib/client/api";

/**
 * The change is applied only when the person clicks the button — not on page load —
 * so email security scanners that open links cannot confirm it by themselves.
 */
export function ConfirmEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function confirm() {
    setState("busy");
    const res = await postJson("/api/auth/email-change/confirm", { token });
    if (!res.ok) {
      setError(res.data.error ?? "Could not confirm.");
      setState("idle");
      return;
    }
    setState("done");
  }

  return (
    <AuthCard title="Confirm new email" description="This makes this inbox the sign-in email for your admin account.">
      {state === "done" ? (
        <div className="flex flex-col gap-5">
          <Alert tone="success" title="Email changed">
            All devices were signed out. Sign in again with your new email.
          </Alert>
          <Button href="/admin/login">Go to sign in</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button size="lg" onClick={confirm} loading={state === "busy"} disabled={!token}>
            Confirm this email address
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
