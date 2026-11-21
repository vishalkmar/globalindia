"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthCard } from "@/components/admin/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { postJson } from "@/lib/client/api";

/** Password reset request. Shows the same message whether or not the account exists. */
export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await postJson("/api/auth/reset/request", { email });
    setBusy(false);
    if (!res.ok) return setError(res.data.error ?? "Could not send the link.");
    setDone(res.data.message);
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email of your admin account. We will send a link to choose a new password."
      footer={
        <Link href="/admin/login" className="font-semibold text-primary underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <Alert tone="success" title="Check your inbox">
          {done}
        </Alert>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Field label="Email">
            <Input type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" loading={busy} disabled={!email}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
