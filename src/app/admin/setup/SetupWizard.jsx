"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthenticatorEnroll } from "@/components/admin/auth/AuthenticatorEnroll";
import { NewPasswordFields, passwordReady } from "@/components/admin/auth/NewPasswordFields";
import { RecoveryCodes } from "@/components/admin/auth/RecoveryCodes";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "password", label: "New password" },
  { id: "authenticator", label: "Authenticator app" },
  { id: "codes", label: "Recovery codes" },
];

/** First-login setup (Phase 5 todo 14): forced password change, then authenticator + recovery codes. */
export function SetupWizard({ mustChangePassword, mfaSetupDone }) {
  const router = useRouter();
  const [step, setStep] = useState(mustChangePassword ? "password" : mfaSetupDone ? "done" : "authenticator");
  const [codes, setCodes] = useState(null);

  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});

  async function savePassword(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const res = await adminJson("/api/auth/password/change", {
      method: "POST",
      json: { currentPassword: current, newPassword: pw },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.data?.error ?? "Could not change the password.");
      setFields(res.data?.fields ?? {});
      return;
    }
    setCurrent("");
    setPw("");
    setConfirm("");
    setStep(mfaSetupDone ? "done" : "authenticator");
  }

  const idx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex items-center gap-2" aria-label="Setup progress">
        {STEPS.map((s, i) => {
          const done = step === "done" || i < idx;
          const active = s.id === step;
          return (
            <li
              key={s.id}
              className="flex flex-1 items-center gap-2"
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-[0.8125rem] font-bold",
                  done
                    ? "border-primary bg-primary text-primary-ink"
                    : active
                      ? "border-primary text-primary"
                      : "border-line text-muted",
                )}
              >
                {done ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn("hidden text-sm font-semibold sm:inline", active ? "text-ink" : "text-muted")}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 ? <span aria-hidden="true" className="h-px flex-1 bg-line" /> : null}
            </li>
          );
        })}
      </ol>

      <div className="rounded-card border border-line bg-card p-6 sm:p-8">
        {step === "password" ? (
          <form onSubmit={savePassword} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-h3">Choose your own password</h2>
              <p className="text-muted">
                The password you signed in with was set by the system. Replace it before continuing.
              </p>
            </div>
            {error ? <Alert tone="error">{error}</Alert> : null}
            <Field label="Current password" error={fields.currentPassword}>
              <Input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
            <NewPasswordFields
              value={pw}
              confirm={confirm}
              onChange={setPw}
              onConfirmChange={setConfirm}
              error={fields.newPassword}
            />
            <Button type="submit" size="lg" loading={busy} disabled={!current || !passwordReady(pw, confirm)}>
              Save password and continue
            </Button>
          </form>
        ) : null}

        {step === "authenticator" ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-h3">Add an authenticator app</h2>
              <p className="text-muted">
                Every admin account uses a phone app as its second step. It works without internet or SMS.
              </p>
            </div>
            <AuthenticatorEnroll
              onEnabled={({ recoveryCodes }) => {
                setCodes(recoveryCodes);
                setStep(recoveryCodes ? "codes" : "done");
              }}
            />
          </div>
        ) : null}

        {step === "codes" && codes ? (
          <div className="flex flex-col gap-5">
            <h2 className="text-h3">Recovery codes</h2>
            <RecoveryCodes
              codes={codes}
              onDone={() => {
                setCodes(null);
                setStep("done");
              }}
            />
          </div>
        ) : null}

        {step === "done" ? (
          <div className="flex flex-col gap-5">
            <Alert tone="success" title="Your account is ready">
              Next time you sign in you will be asked for a code from your authenticator app.
            </Alert>
            <Button
              size="lg"
              onClick={() => {
                router.replace("/admin");
                router.refresh();
              }}
            >
              Go to the admin panel
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
