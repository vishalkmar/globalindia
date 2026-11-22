"use client";

import { KeyRound, Mail, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuthCard } from "@/components/admin/auth/AuthCard";
import { CodeInput } from "@/components/admin/auth/CodeInput";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { postJson } from "@/lib/client/api";
import { safeNext } from "@/lib/client/safeNext";
import { cn } from "@/lib/utils";

const METHODS = {
  totp: {
    label: "Authenticator app",
    icon: Smartphone,
    hint: "Open your authenticator app and enter the 6-digit code for Global India.",
  },
  email: {
    label: "Email code",
    icon: Mail,
    hint: "We email a 6-digit code to your admin address. It works once, for 5 minutes.",
  },
  recovery: {
    label: "Recovery code",
    icon: KeyRound,
    hint: "Use one of the 10 backup codes you saved when you set up the authenticator.",
  },
};

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
}

export function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const available = (params.get("m") ?? "email").split(",").filter((m) => m in METHODS);
  const methods = available.length ? available : ["email"];

  const [method, setMethod] = useState(methods[0]);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useCountdown();
  const autoSent = useRef(false);

  const expired = useCallback(
    (status) => {
      if (status === 401) {
        router.replace(`/admin/login?expired=1`);
        return true;
      }
      return false;
    },
    [router],
  );

  const sendEmailCode = useCallback(async () => {
    setError("");
    setInfo("");
    setBusy(true);
    const res = await postJson("/api/auth/otp/send", { method: "email" });
    setBusy(false);
    if (expired(res.status)) return;
    if (!res.ok) {
      setError(res.data.error ?? "Could not send the code.");
      if (res.status === 429) setCooldown(60);
      return;
    }
    setSent(true);
    setCooldown(res.data.resendAfter ?? 60);
    setInfo("Code sent. Check your inbox (and the spam folder).");
  }, [expired, setCooldown]);

  // If email is the only method, send the first code straight away.
  useEffect(() => {
    if (method === "email" && methods.length === 1 && !autoSent.current) {
      autoSent.current = true;
      sendEmailCode();
    }
  }, [method, methods.length, sendEmailCode]);

  async function verify(value) {
    const payload = method === "recovery" ? recovery : (value ?? code);
    if (!payload) return;
    setError("");
    setBusy(true);
    const url = {
      totp: "/api/auth/verify-totp",
      email: "/api/auth/verify-otp",
      recovery: "/api/auth/verify-recovery",
    }[method];
    const res = await postJson(url, { code: payload });
    if (expired(res.status)) return;
    if (!res.ok) {
      setBusy(false);
      setError(res.data.error ?? "That code is not correct.");
      setCode("");
      return;
    }
    const dest = res.data.next === "/admin/setup" ? "/admin/setup" : next;
    router.replace(dest);
    router.refresh();
  }

  const M = METHODS[method];

  return (
    <AuthCard
      title="Second step"
      description={M.hint}
      footer={
        <Link href="/admin/login" className="font-semibold text-primary underline underline-offset-4">
          Start again with a different account
        </Link>
      }
    >
      <div className="flex flex-col gap-5">
        {methods.length > 1 ? (
          <div
            role="radiogroup"
            aria-label="Verification method"
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0,1fr))` }}
          >
            {methods.map((m) => {
              const Icon = METHODS[m].icon;
              const active = m === method;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setMethod(m);
                    setError("");
                    setInfo("");
                    setCode("");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-btn border px-2 py-3 text-[0.8125rem] font-semibold transition-colors",
                    active
                      ? "border-primary bg-[color-mix(in_oklab,var(--c-primary)_6%,var(--c-card))] text-primary"
                      : "border-line text-muted hover:text-ink",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
                  {METHODS[m].label}
                </button>
              );
            })}
          </div>
        ) : null}

        {error ? <Alert tone="error">{error}</Alert> : null}
        {info && !error ? <Alert tone="success">{info}</Alert> : null}

        {method === "recovery" ? (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            <Field label="Recovery code" hint="Looks like ABCDE-12345. Each code works once.">
              <Input
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={recovery}
                onChange={(e) => setRecovery(e.target.value.toUpperCase().slice(0, 11))}
                className="font-data tracking-widest uppercase"
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              loading={busy}
              disabled={recovery.replace(/-/g, "").length !== 10}
            >
              Verify and sign in
            </Button>
          </form>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              verify();
            }}
          >
            {method === "email" && !sent ? (
              <Button variant="secondary" size="lg" onClick={sendEmailCode} loading={busy}>
                Email me a code
              </Button>
            ) : (
              <>
                <Field label="6-digit code">
                  <CodeInput
                    value={code}
                    onChange={setCode}
                    onComplete={(c) => !busy && verify(c)}
                    disabled={busy}
                  />
                </Field>
                <Button type="submit" size="lg" loading={busy} disabled={code.length !== 6}>
                  Verify and sign in
                </Button>
              </>
            )}
            {method === "email" && sent ? (
              <button
                type="button"
                onClick={sendEmailCode}
                disabled={cooldown > 0 || busy}
                className="self-center text-sm font-semibold text-primary underline underline-offset-4 disabled:text-muted disabled:no-underline"
              >
                {cooldown > 0 ? `Send a new code in ${cooldown} s` : "Send a new code"}
              </button>
            ) : null}
          </form>
        )}
      </div>
    </AuthCard>
  );
}
