"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, PasswordInput } from "@/components/ui/Field";
import { adminJson, setStepUpHandler } from "@/lib/client/adminFetch";

/**
 * Password prompt for sensitive actions (Phase 25 todo 10). adminFetch calls it when the server
 * answers 403 "step_up"; on success the original request is sent again. Valid for 10 minutes.
 */
export function StepUpDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resolver = useRef(null);

  useEffect(() => {
    setStepUpHandler(
      () =>
        new Promise((resolve) => {
          resolver.current = resolve;
          setPassword("");
          setError("");
          setOpen(true);
        }),
    );
    return () => setStepUpHandler(null);
  }, []);

  const finish = (ok) => {
    setOpen(false);
    setPassword("");
    resolver.current?.(ok);
    resolver.current = null;
  };

  async function submit(e) {
    e.preventDefault();
    if (!password) return setError("Enter your password.");
    setBusy(true);
    const res = await adminJson("/api/auth/step-up", { method: "POST", json: { password } });
    setBusy(false);
    if (res.ok) return finish(true);
    setError(res.status === 429 ? "Too many tries. Wait a few minutes." : "That password is not correct.");
  }

  return (
    <Dialog
      open={open}
      onClose={() => finish(false)}
      title="Confirm it is you"
      description="This change needs your password. You will not be asked again for 10 minutes."
      size="sm"
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Your password" error={error}>
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => finish(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Confirm
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
