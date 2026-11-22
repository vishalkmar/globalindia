"use client";

import { useEffect, useState } from "react";

import { CodeInput } from "@/components/admin/auth/CodeInput";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";

/**
 * Authenticator enrolment:
 * 1. Server creates a pending secret -> QR (rendered as <img>, cannot run script) + manual key.
 * 2. "Send approval code" -> code goes to the DEFAULT admin email.
 * 3. Enter the approval code AND the current code from the app -> switched on.
 * Calls onEnabled({ recoveryCodes }) at the end.
 */
export function AuthenticatorEnroll({ onEnabled, onCancel }) {
  const [setup, setSetup] = useState(null);
  const [step, setStep] = useState("scan");
  const [request, setRequest] = useState(null);
  const [approval, setApproval] = useState("");
  const [appCode, setAppCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});

  useEffect(() => {
    let live = true;
    adminJson("/api/auth/totp/setup", { method: "POST", json: {} }).then((res) => {
      if (!live) return;
      if (res.ok) setSetup(res.data);
      else setError(res.data?.error ?? "Could not start authenticator setup.");
    });
    return () => {
      live = false;
    };
  }, []);

  async function sendApproval() {
    setBusy(true);
    setError("");
    const res = await adminJson("/api/auth/mfa/request", {
      method: "POST",
      json: { method: "totp", enable: true },
    });
    setBusy(false);
    if (!res.ok) return setError(res.data?.error ?? "Could not send the approval code.");
    setRequest(res.data);
    setStep("confirm");
  }

  async function confirm(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const res = await adminJson("/api/auth/mfa/confirm", {
      method: "POST",
      json: { requestId: request.requestId, code: approval, totpCode: appCode },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.data?.error ?? "Could not switch on the authenticator.");
      setFields(res.data?.fields ?? {});
      setAppCode("");
      return;
    }
    onEnabled?.({ recoveryCodes: res.data.recoveryCodes });
  }

  if (!setup && !error) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="mx-auto size-48" />
        <Skeleton lines={2} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {setup && step === "scan" ? (
        <>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[0.9375rem] text-ink">
            <li>Open Google Authenticator, Microsoft Authenticator or a similar app.</li>
            <li>Add an account and scan this QR code.</li>
            <li>Then ask for the approval code below.</li>
          </ol>
          <div className="flex justify-center rounded-card border border-line bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- server-generated SVG as data URL; an <img> cannot run scripts */}
            <img
              src={`data:image/svg+xml;base64,${typeof window !== "undefined" ? window.btoa(setup.qrSvg) : ""}`}
              alt={`QR code to add Global India (${setup.account}) to an authenticator app`}
              width={192}
              height={192}
              className="size-48"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-label text-muted">Cannot scan? Enter this key in the app</span>
            <code className="rounded-btn border border-line bg-surface px-3 py-2 text-center font-data text-[0.9375rem] tracking-wider select-all">
              {setup.manualKey}
            </code>
          </div>
          <Alert tone="info">
            For safety, switching on an authenticator needs an approval code sent to the owner&rsquo;s email
            inbox.
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={sendApproval} loading={busy}>
              I have scanned it, send approval code
            </Button>
            {onCancel ? (
              <Button variant="ghost" size="lg" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      {step === "confirm" ? (
        <form onSubmit={confirm} noValidate className="flex flex-col gap-5">
          <Alert tone="success">Approval code sent to {request.sentTo}.</Alert>
          <Field label="Approval code from email" error={fields.code}>
            <CodeInput value={approval} onChange={setApproval} autoFocus />
          </Field>
          <Field
            label="Current code from your authenticator app"
            error={fields.totpCode}
            hint="The app shows a new code every 30 seconds."
          >
            <CodeInput value={appCode} onChange={setAppCode} autoFocus={false} />
          </Field>
          <Button
            type="submit"
            size="lg"
            loading={busy}
            disabled={approval.length !== 6 || appCode.length !== 6}
          >
            Switch on authenticator
          </Button>
        </form>
      ) : null}
    </div>
  );
}
