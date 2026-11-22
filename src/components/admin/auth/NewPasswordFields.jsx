"use client";

import { Check } from "lucide-react";

import { Field, PasswordInput } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

/** New password + confirmation with live rule hints (rules are enforced again on the server). */
export function NewPasswordFields({ value, confirm, onChange, onConfirmChange, error }) {
  const rules = [
    { ok: value.length >= 12, label: "At least 12 characters" },
    { ok: /[a-z]/i.test(value) && /\d|[^a-z]/i.test(value), label: "Letters plus a number or symbol" },
    { ok: value.length > 0 && value === confirm, label: "Both entries match" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Field label="New password" error={error}>
        <PasswordInput autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
      <Field label="Type it again">
        <PasswordInput
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
        />
      </Field>
      <ul className="flex flex-col gap-1.5 text-sm" aria-label="Password rules">
        {rules.map((r) => (
          <li key={r.label} className={cn("flex items-center gap-2", r.ok ? "text-success" : "text-muted")}>
            <Check aria-hidden="true" className={cn("size-4", !r.ok && "opacity-30")} strokeWidth={2} />
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function passwordReady(value, confirm) {
  return value.length >= 12 && value === confirm;
}
