"use client";

import { X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Checkbox, Field, Input, PasswordInput, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

import { RichTextEditor } from "./RichTextEditor";

/**
 * Form state driven by a Zod schema (Phase 6 todo 06). The SAME schema validates on the server,
 * so client checks are only for fast feedback.
 *
 * @param {import('zod').ZodType} schema
 * @param {object} initial
 */
export function useZodForm(schema, initial) {
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  const validate = useCallback(() => {
    const r = schema.safeParse(values);
    if (r.success) {
      setErrors({});
      return { ok: true, data: r.data };
    }
    const next = {};
    for (const issue of r.error.issues) {
      const key = issue.path.join(".");
      if (!next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return { ok: false, errors: next };
  }, [schema, values]);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(baseline), [values, baseline]);

  /** Call after a successful save (optionally with the server's version of the data). */
  const markSaved = useCallback((saved) => {
    const next = saved ?? values;
    setValues(next);
    setBaseline(next);
  }, [values]);

  return { values, set, setValues, errors, setErrors, validate, dirty, markSaved };
}

function TagsInput({ value = [], onChange, placeholder, ...props }) {
  const [draft, setDraft] = useState("");
  function add(raw) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange(Array.from(new Set([...value, ...parts])).slice(0, 50));
    setDraft("");
  }
  return (
    <div className="flex flex-col gap-2">
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <li key={t} className="inline-flex h-7 items-center gap-1 rounded-btn border border-line bg-surface pr-1 pl-2.5 text-sm">
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="rounded p-0.5 text-muted hover:text-ink">
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        {...props}
        value={draft}
        placeholder={placeholder ?? "Type and press Enter (comma separates)"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />
    </div>
  );
}

/**
 * Renders a list of field definitions bound to useZodForm state.
 * Field types: text, email, tel, url, number, password, textarea, select, checkbox, richtext, tags.
 *
 * @param {{
 *   form: ReturnType<typeof useZodForm>,
 *   fields: { name: string, label: string, type?: string, hint?: string, placeholder?: string,
 *             options?: {value:string,label:string}[], wide?: boolean, required?: boolean, disabled?: boolean,
 *             autoComplete?: string, rows?: number, maxLength?: number }[],
 *   columns?: 1 | 2,
 * }} props
 */
export function FormBuilder({ form, fields, columns = 2, className }) {
  const { values, set, errors } = form;
  return (
    <div className={cn("grid gap-5", columns === 2 && "md:grid-cols-2", className)}>
      {fields.map((f) => {
        const type = f.type ?? "text";
        const value = values[f.name];
        const common = { name: f.name, disabled: f.disabled, placeholder: f.placeholder, autoComplete: f.autoComplete ?? "off", maxLength: f.maxLength };
        const span = f.wide || type === "richtext" || type === "textarea" ? "md:col-span-2" : "";

        if (type === "checkbox") {
          return (
            <div key={f.name} className={cn(span, "pt-1")}>
              <Checkbox label={f.label} description={f.hint} checked={Boolean(value)} disabled={f.disabled} onChange={(e) => set(f.name, e.target.checked)} />
              {errors[f.name] ? <p className="mt-1 text-[0.8125rem] text-error">{errors[f.name]}</p> : null}
            </div>
          );
        }
        if (type === "richtext") {
          return (
            <div key={f.name} className={span}>
              <RichTextEditor label={f.label} hint={f.hint} value={value ?? ""} onChange={(html) => set(f.name, html)} />
              {errors[f.name] ? <p className="mt-1 text-[0.8125rem] text-error">{errors[f.name]}</p> : null}
            </div>
          );
        }

        let control;
        if (type === "textarea") control = <Textarea {...common} rows={f.rows ?? 4} value={value ?? ""} onChange={(e) => set(f.name, e.target.value)} />;
        else if (type === "select")
          control = (
            <Select {...common} value={value ?? ""} onChange={(e) => set(f.name, e.target.value)}>
              {f.placeholder ? (
                <option value="" disabled>
                  {f.placeholder}
                </option>
              ) : null}
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          );
        else if (type === "tags") control = <TagsInput {...common} value={value ?? []} onChange={(v) => set(f.name, v)} />;
        else if (type === "password") control = <PasswordInput {...common} value={value ?? ""} onChange={(e) => set(f.name, e.target.value)} />;
        else if (type === "number")
          control = (
            <Input
              {...common}
              type="number"
              inputMode="decimal"
              value={value ?? ""}
              onChange={(e) => set(f.name, e.target.value === "" ? null : Number(e.target.value))}
            />
          );
        else control = <Input {...common} type={type} value={value ?? ""} onChange={(e) => set(f.name, e.target.value)} />;

        return (
          <Field key={f.name} label={f.label} hint={f.hint} error={errors[f.name]} required={f.required} className={span}>
            {control}
          </Field>
        );
      })}
    </div>
  );
}
