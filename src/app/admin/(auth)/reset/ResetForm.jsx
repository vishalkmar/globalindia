"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuthCard } from "@/components/admin/auth/AuthCard";
import { NewPasswordFields, passwordReady } from "@/components/admin/auth/NewPasswordFields";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Static";
import { postJson } from "@/lib/client/api";

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setField("");
    const res = await postJson("/api/auth/reset/confirm", { token, newPassword: pw });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error ?? "Could not reset the password.");
      setField(res.data.fields?.newPassword ?? "");
      return;
    }
    setDone(true);
    setPw("");
    setConfirm("");
  }

  if (!token) {
    return (
      <AuthCard title="Link not valid" description="This page needs the link from the reset email.">
        <Button href="/admin/forgot" variant="secondary">
          Ask for a new link
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="After this, every device signed in to your account is signed out."
      footer={
        <Link href="/admin/login" className="font-semibold text-primary underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="flex flex-col gap-5">
          <Alert tone="success" title="Password changed">
            Sign in with your new password. You will still need your second step.
          </Alert>
          <Button href="/admin/login">Go to sign in</Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <NewPasswordFields value={pw} confirm={confirm} onChange={setPw} onConfirmChange={setConfirm} error={field} />
          <Button type="submit" size="lg" loading={busy} disabled={!passwordReady(pw, confirm)}>
            Save new password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
