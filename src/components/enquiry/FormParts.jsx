"use client";

import { Send } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";

import { Honeypot, Turnstile } from "./FormSecurity";

/** Shared pieces of the public enquiry forms. */
export function ProductSelect({ products, value, onChange, label, error, id }) {
  const groups = useMemo(() => {
    const out = new Map();
    for (const p of products) out.set(p.category, [...(out.get(p.category) ?? []), p]);
    return [...out.entries()];
  }, [products]);
  return (
    <Field label={label} error={error} required id={id}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      >
        <option value="">Choose a product</option>
        {groups.map(([cat, list]) => (
          <optgroup key={cat} label={cat}>
            {list.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </Field>
  );
}

export function Person({
  f,
  phoneRequired = false,
  cityRequired = false,
  cityLabel = "City",
  showCity = true,
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Your name" required error={f.errors.name}>
        <Input
          value={f.values.name}
          onChange={(e) => f.set("name", e.target.value)}
          autoComplete="name"
          maxLength={80}
        />
      </Field>
      <Field label="Company" error={f.errors.company}>
        <Input
          value={f.values.company}
          onChange={(e) => f.set("company", e.target.value)}
          autoComplete="organization"
          maxLength={120}
        />
      </Field>
      <Field label="Email" required error={f.errors.email}>
        <Input
          type="email"
          value={f.values.email}
          onChange={(e) => f.set("email", e.target.value)}
          autoComplete="email"
          maxLength={254}
        />
      </Field>
      <Field
        label="Phone"
        required={phoneRequired}
        error={f.errors.phone}
        hint="Mobile or landline, with STD code."
      >
        <Input
          type="tel"
          value={f.values.phone}
          onChange={(e) => f.set("phone", e.target.value)}
          autoComplete="tel"
          maxLength={20}
          inputMode="tel"
        />
      </Field>
      {showCity ? (
        <Field label={cityLabel} required={cityRequired} error={f.errors.city}>
          <Input
            value={f.values.city}
            onChange={(e) => f.set("city", e.target.value)}
            autoComplete="address-level2"
            maxLength={80}
          />
        </Field>
      ) : null}
    </div>
  );
}

export function Footer({ f, label = "Send", children }) {
  return (
    <div className="flex flex-col gap-4">
      <Honeypot value={f.honeypot} onChange={f.setHoneypot} />
      <Turnstile onToken={f.setToken} resetKey={f.resetKey} />
      {f.formError ? <Alert tone="error">{f.formError}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <Button type="submit" loading={f.busy}>
          <Send aria-hidden="true" /> {label}
        </Button>
      </div>
      <p className="text-[0.8125rem] text-muted">
        We use your details only to answer this enquiry. No newsletters unless you sign up for them.
      </p>
    </div>
  );
}
