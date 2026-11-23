"use client";

import { Send } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { Field, Select } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";

/** Email preview and test send (Phase 16 todo 04). The preview frame is sandboxed: no scripts, no forms. */
export function EmailPreview({ templates, canSend }) {
  const toast = useToast();
  const [key, setKey] = useState(templates[0]?.key);
  const [mail, setMail] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    adminJson(`/api/admin/emails?template=${encodeURIComponent(key)}`).then((r) => {
      if (!live) return;
      if (!r.ok) return setError(r.data?.error ?? "Could not load the preview.");
      setError("");
      setMail(r.data);
    });
    return () => {
      live = false;
    };
  }, [key]);

  async function send() {
    setBusy(true);
    const r = await adminJson("/api/admin/emails", { method: "POST", json: { template: key } });
    setBusy(false);
    if (!r.ok) return toast.error(r.data?.error ?? "Could not send.");
    toast.success(`Test email sent to ${r.data.to}.`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Email" className="min-w-64 flex-1">
          <Select
            value={key}
            onChange={(e) => {
              setMail(null);
              setKey(e.target.value);
            }}
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        {canSend ? (
          <Button onClick={send} loading={busy} variant="secondary">
            <Send aria-hidden="true" /> Send a test to me
          </Button>
        ) : null}
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {mail ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            <span className="text-muted">Subject: </span>
            <strong>{mail.subject}</strong>
          </p>
          <iframe
            title={`Preview: ${mail.subject}`}
            sandbox=""
            srcDoc={mail.html}
            className="h-[640px] w-full surface-card bg-white"
          />
        </div>
      ) : (
        <Skeleton className="h-[640px]" />
      )}
    </div>
  );
}
