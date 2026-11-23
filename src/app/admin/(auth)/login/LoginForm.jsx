"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthCard } from "@/components/admin/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { refreshSession } from "@/lib/client/adminFetch";
import { postJson } from "@/lib/client/api";
import { safeNext } from "@/lib/client/safeNext";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    params.get("expired") ? "Your sign-in step timed out. Please start again." : "",
  );
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(Boolean(params.get("next")));

  // Arrived here because the 10-minute access token ran out? Try a silent refresh first.
  useEffect(() => {
    if (!params.get("next")) return undefined;
    let cancelled = false;
    refreshSession().then((ok) => {
      if (cancelled) return;
      if (ok) router.replace(next);
      else setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params, next, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    const res = await postJson("/api/auth/login", { email, password });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? "Could not sign in.");
      setFields(res.data.fields ?? {});
      setPassword("");
      return;
    }
    // Password-only mode: the session already exists, go straight in (setup first if pending).
    if (!res.data.methods && res.data.next) {
      router.replace(res.data.next === "/admin" ? next : res.data.next);
      router.refresh();
      return;
    }
    const q = new URLSearchParams({ next, m: (res.data.methods ?? ["email"]).join(",") });
    router.push(`/admin/verify?${q.toString()}`);
  }

  if (checking) {
    return (
      <AuthCard title="Signing you in" description="Checking your session.">
        <div className="flex flex-col gap-3" aria-busy="true">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in"
      description="Use the email and password for your admin account."
      footer={
        <>
          Forgot your password?{" "}
          <Link href="/admin/forgot" className="font-semibold text-primary underline underline-offset-4">
            Reset it
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {!error && params.get("reason") === "idle" ? (
          <Alert tone="info">You were signed out after 30 minutes without activity. Sign in to continue.</Alert>
        ) : null}
        <Field label="Email" error={fields.email}>
          <Input
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" error={fields.password}>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" size="lg" loading={busy} disabled={!email || !password}>
          Continue
        </Button>
      </form>
    </AuthCard>
  );
}
