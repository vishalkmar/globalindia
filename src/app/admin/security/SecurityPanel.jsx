"use client";

import { Laptop, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AuthenticatorEnroll } from "@/components/admin/auth/AuthenticatorEnroll";
import { CodeInput } from "@/components/admin/auth/CodeInput";
import { NewPasswordFields, passwordReady } from "@/components/admin/auth/NewPasswordFields";
import { RecoveryCodes } from "@/components/admin/auth/RecoveryCodes";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Field";
import { Alert, IconBox, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";

function Panel({ title, description, children }) {
  return (
    <section className="rounded-card border border-line bg-card">
      <header className="flex flex-col gap-1 border-b border-line px-6 py-5">
        <h2 className="text-h4 text-primary">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

const when = (d) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));

/* ---------- MFA toggle dialog (approval code to default admin email) ---------- */
function MfaToggleDialog({ change, approvalEmail, onClose, onDone }) {
  const [request, setRequest] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const open = Boolean(change);

  async function send() {
    setBusy(true);
    setError("");
    const res = await adminJson("/api/auth/mfa/request", { method: "POST", json: { method: change.method, enable: change.enable } });
    setBusy(false);
    if (!res.ok) return setError(res.data?.error ?? "Could not send the approval code.");
    setRequest(res.data);
  }

  async function confirm(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await adminJson("/api/auth/mfa/confirm", { method: "POST", json: { requestId: request.requestId, code } });
    setBusy(false);
    if (!res.ok) {
      setCode("");
      return setError(res.data?.error ?? "Could not apply the change.");
    }
    onDone(res.data.change);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={change ? `${change.enable ? "Turn on" : "Turn off"} ${change.method === "totp" ? "authenticator app" : "email codes"}` : ""}
      description={`For safety, this needs an approval code sent to the owner's inbox (${approvalEmail}).`}
    >
      <div className="flex flex-col gap-5">
        {error ? <Alert tone="error">{error}</Alert> : null}
        {!request ? (
          <Button onClick={send} loading={busy}>
            Send approval code
          </Button>
        ) : (
          <form onSubmit={confirm} className="flex flex-col gap-5">
            <Alert tone="success">Code sent to {request.sentTo}. It works once, for 5 minutes.</Alert>
            <Field label="Approval code">
              <CodeInput value={code} onChange={setCode} />
            </Field>
            <Button type="submit" loading={busy} disabled={code.length !== 6}>
              Confirm change
            </Button>
          </form>
        )}
      </div>
    </Dialog>
  );
}

/* ---------- Email change (3 steps) ---------- */
function EmailChange({ currentEmail }) {
  const [step, setStep] = useState("form");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [request, setRequest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});

  async function start(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const res = await adminJson("/api/auth/email-change/start", { method: "POST", json: { newEmail, currentPassword: password } });
    setBusy(false);
    setPassword("");
    if (!res.ok) {
      setFields(res.data?.fields ?? {});
      return setError(res.data?.error ?? "Could not start the change.");
    }
    setRequest(res.data);
    setStep("otp");
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await adminJson("/api/auth/email-change/verify", { method: "POST", json: { requestId: request.requestId, code } });
    setBusy(false);
    if (!res.ok) {
      setCode("");
      return setError(res.data?.error ?? "That code is not correct.");
    }
    setRequest((r) => ({ ...r, linkSentTo: res.data.sentTo }));
    setStep("link");
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Current sign-in email: <span className="font-semibold text-ink">{currentEmail}</span>
      </p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {step === "form" ? (
        <form onSubmit={start} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label="New email" error={fields.newEmail}>
            <Input type="email" autoComplete="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </Field>
          <Field label="Current password" error={fields.currentPassword}>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" loading={busy} disabled={!newEmail || !password}>
              Continue
            </Button>
          </div>
        </form>
      ) : null}
      {step === "otp" ? (
        <form onSubmit={verify} className="flex max-w-sm flex-col gap-4">
          <Alert tone="info">We sent a code to your current inbox ({request.sentTo}).</Alert>
          <Field label="Code from your current email">
            <CodeInput value={code} onChange={setCode} />
          </Field>
          <Button type="submit" loading={busy} disabled={code.length !== 6}>
            Verify code
          </Button>
        </form>
      ) : null}
      {step === "link" ? (
        <Alert tone="success" title="Almost done">
          If {request.linkSentTo} can be used, a confirmation link is waiting there. Open it within 30 minutes to finish. Every device will then be signed
          out.
        </Alert>
      ) : null}
    </div>
  );
}

/* ---------- Password change ---------- */
function PasswordChange() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const res = await adminJson("/api/auth/password/change", { method: "POST", json: { currentPassword: current, newPassword: pw } });
    setBusy(false);
    if (!res.ok) {
      setFields(res.data?.fields ?? {});
      return setError(res.data?.error ?? "Could not change the password.");
    }
    setCurrent("");
    setPw("");
    setConfirm("");
    toast.success("Password changed. Other devices were signed out.");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field label="Current password" error={fields.currentPassword}>
        <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <NewPasswordFields value={pw} confirm={confirm} onChange={setPw} onConfirmChange={setConfirm} error={fields.newPassword} />
      <div>
        <Button type="submit" variant="secondary" loading={busy} disabled={!current || !passwordReady(pw, confirm)}>
          Change password
        </Button>
      </div>
    </form>
  );
}

/* ---------- Page ---------- */
export function SecurityPanel() {
  const toast = useToast();
  const [me, setMe] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [change, setChange] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [codes, setCodes] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let live = true;
    Promise.all([adminJson("/api/auth/me"), adminJson("/api/auth/sessions")]).then(([a, b]) => {
      if (!live) return;
      if (a.ok) setMe(a.data);
      if (b.ok) setSessions(b.data.sessions);
    });
    return () => {
      live = false;
    };
  }, [reloadKey]);

  async function revoke(id) {
    const res = await adminJson("/api/auth/sessions", { method: "DELETE", json: { id } });
    if (res.ok) {
      toast.success("That device was signed out.");
      load();
    } else toast.error(res.data?.error ?? "Could not sign out that device.");
  }

  async function logoutAll() {
    await adminJson("/api/auth/logout-all", { method: "POST", json: {}, noRedirect: true });
    window.location.replace("/admin/login");
  }

  if (!me) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const u = me.user;
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Sign-in methods" description={`Changes need an approval code sent to the owner's inbox (${me.approvalEmail}). At least one method always stays on.`}>
        <ul className="flex flex-col divide-y divide-line">
          <li className="flex flex-wrap items-center gap-4 py-4 first:pt-0">
            <IconBox icon={Smartphone} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Authenticator app</p>
              <p className="text-sm text-muted">Codes from Google Authenticator, Microsoft Authenticator or similar.</p>
            </div>
            <Badge tone={u.totpEnabled ? "success" : "neutral"}>{u.totpEnabled ? "On" : "Off"}</Badge>
            {u.totpEnabled ? (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEnrolling(true)}>
                  Replace
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setChange({ method: "totp", enable: false })}>
                  Turn off
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setEnrolling(true)}>
                Turn on
              </Button>
            )}
          </li>
          <li className="flex flex-wrap items-center gap-4 py-4 last:pb-0">
            <IconBox icon={Mail} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Email codes</p>
              <p className="text-sm text-muted">A 6-digit code sent to {u.email}.</p>
            </div>
            <Badge tone={u.emailOtpEnabled ? "success" : "neutral"}>{u.emailOtpEnabled ? "On" : "Off"}</Badge>
            <Button
              size="sm"
              variant={u.emailOtpEnabled ? "ghost" : "secondary"}
              disabled={u.emailOtpEnabled && !u.totpEnabled}
              onClick={() => setChange({ method: "email", enable: !u.emailOtpEnabled })}
            >
              {u.emailOtpEnabled ? "Turn off" : "Turn on"}
            </Button>
          </li>
        </ul>
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <ShieldCheck aria-hidden="true" className="size-4" strokeWidth={1.5} />
          Recovery codes left: <span className="font-data text-ink">{u.recoveryCodesLeft}</span> of 10
        </p>
      </Panel>

      <Panel title="Password" description="Changing it signs out every other device.">
        <PasswordChange />
      </Panel>

      <Panel title="Sign-in email" description="Needs your password, a code from the current inbox and a link opened from the new inbox.">
        <EmailChange currentEmail={u.email} />
      </Panel>

      <Panel title="Devices" description="Where your account is signed in right now.">
        {sessions === null ? (
          <Skeleton lines={3} />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 py-3.5">
                <Laptop aria-hidden="true" className="size-5 text-muted" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {s.device} {s.current ? <Badge tone="primary">This device</Badge> : null}
                  </p>
                  <p className="text-sm text-muted">
                    Signed in {when(s.signedInAt)} · last active {when(s.lastUsedAt)}
                  </p>
                </div>
                {!s.current ? (
                  <Button size="sm" variant="ghost" onClick={() => revoke(s.id)}>
                    Sign out
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-line pt-4">
          <Button variant="secondary" size="sm" onClick={logoutAll}>
            Sign out everywhere
          </Button>
        </div>
      </Panel>

      <MfaToggleDialog
        key={change ? `${change.method}-${change.enable}` : "closed"}
        change={change}
        approvalEmail={me.approvalEmail}
        onClose={() => setChange(null)}
        onDone={(label) => {
          setChange(null);
          toast.success(`${label}.`);
          load();
        }}
      />

      <Dialog open={enrolling} onClose={() => setEnrolling(false)} title={u.totpEnabled ? "Replace authenticator app" : "Turn on authenticator app"} size="md">
        {enrolling ? (
          <AuthenticatorEnroll
            onCancel={() => setEnrolling(false)}
            onEnabled={({ recoveryCodes }) => {
              setEnrolling(false);
              toast.success("Authenticator app is on.");
              if (recoveryCodes) setCodes(recoveryCodes);
              load();
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(codes)} onClose={() => setCodes(null)} title="New recovery codes">
        {codes ? <RecoveryCodes codes={codes} onDone={() => setCodes(null)} doneLabel="Done" /> : null}
      </Dialog>
    </div>
  );
}
