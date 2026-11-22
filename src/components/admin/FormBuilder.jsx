"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, PasswordInput, Select, Textarea } from "@/components/ui/Field";
import { adminJson } from "@/lib/client/adminFetch";
import { cn } from "@/lib/utils";

import { MediaPicker } from "./media/MediaPicker";
import { RichTextEditor } from "./RichTextEditor";

/**
 * Form state driven by a Zod schema (Phase 6 todo 06). The SAME schema validates on the server,
 * so client checks are only for fast feedback. Error keys are dotted paths ("address.pin", "phones.0.number").
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
    setErrors((e) => {
      const keys = Object.keys(e).filter((k) => k === name || k.startsWith(`${name}.`));
      if (!keys.length) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
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
  const markSaved = useCallback(
    (saved) => {
      const next = saved ?? values;
      setValues(next);
      setBaseline(next);
    },
    [values],
  );

  /** Replace everything (e.g. restoring a revision) without touching the saved baseline. */
  const load = useCallback((data) => {
    setValues(data);
    setErrors({});
  }, []);

  return { values, set, setValues, errors, setErrors, validate, dirty, markSaved, load };
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
            <li
              key={t}
              className="inline-flex h-7 items-center gap-1 rounded-btn border border-line bg-surface pr-1 pl-2.5 text-sm"
            >
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => onChange(value.filter((x) => x !== t))}
                className="rounded p-0.5 text-muted hover:text-ink"
              >
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

/** Media field storing only the asset id; loads the asset for display when needed. */
function MediaIdField({ def, value, onChange, error, cache }) {
  const [asset, setAsset] = useState(value ? (cache?.[value] ?? null) : null);
  useEffect(() => {
    if (!value || asset?.id === value) return undefined;
    let live = true;
    adminJson(`/api/admin/media/${value}`).then((r) => live && r.ok && setAsset(r.data.asset));
    return () => {
      live = false;
    };
  }, [value, asset?.id]);
  return (
    <MediaPicker
      label={def.label}
      hint={def.hint}
      error={error}
      accept={def.accept ?? "image"}
      folder={def.folder ?? "library"}
      value={value ? asset : null}
      onChange={(a) => {
        setAsset(a);
        onChange(a?.id ?? null);
      }}
    />
  );
}

/**
 * One field. Types: text, email, tel, url, number, password, textarea, select, checkbox, richtext,
 * tags, media, group (nested object) and repeater (list of objects).
 */
function FieldControl({ def, value, onChange, errors, path, mediaCache }) {
  const type = def.type ?? "text";
  const error = errors[path];
  const common = {
    name: path,
    disabled: def.disabled,
    placeholder: def.placeholder,
    autoComplete: def.autoComplete ?? "off",
    maxLength: def.maxLength,
  };

  if (type === "checkbox") {
    return (
      <div className="pt-1">
        <Checkbox
          label={def.label}
          description={def.hint}
          checked={Boolean(value)}
          disabled={def.disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {error ? <p className="mt-1 text-[0.8125rem] text-error">{error}</p> : null}
      </div>
    );
  }
  if (type === "richtext") {
    return (
      <div>
        <RichTextEditor label={def.label} hint={def.hint} value={value ?? ""} onChange={onChange} />
        {error ? <p className="mt-1 text-[0.8125rem] text-error">{error}</p> : null}
      </div>
    );
  }
  if (type === "media")
    return (
      <MediaIdField def={def} value={value ?? null} onChange={onChange} error={error} cache={mediaCache} />
    );

  if (type === "group") {
    const obj = value ?? {};
    return (
      <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
        <legend className="px-1 text-label text-ink">{def.label}</legend>
        {def.hint ? <p className="-mt-1 text-[0.8125rem] text-muted">{def.hint}</p> : null}
        <div className={cn("grid gap-4", def.columns !== 1 && "md:grid-cols-2")}>
          {def.fields.map((sub) => (
            <div key={sub.name} className={sub.wide ? "md:col-span-2" : ""}>
              <FieldControl
                def={sub}
                value={obj[sub.name]}
                onChange={(v) => onChange({ ...obj, [sub.name]: v })}
                errors={errors}
                path={`${path}.${sub.name}`}
                mediaCache={mediaCache}
              />
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  if (type === "repeater") {
    const list = Array.isArray(value) ? value : [];
    const blank = Object.fromEntries(def.fields.map((s) => [s.name, s.type === "checkbox" ? false : ""]));
    return (
      <fieldset className="flex flex-col gap-3 rounded-card border border-line p-4">
        <legend className="px-1 text-label text-ink">{def.label}</legend>
        {def.hint ? <p className="-mt-1 text-[0.8125rem] text-muted">{def.hint}</p> : null}
        {list.length === 0 ? <p className="text-sm text-muted">None added.</p> : null}
        {list.map((item, i) => (
          <div key={i} className="flex items-start gap-3 rounded-btn border border-line bg-surface p-3">
            <div className="grid flex-1 gap-3 md:grid-cols-2">
              {def.fields.map((sub) => (
                <FieldControl
                  key={sub.name}
                  def={sub}
                  value={item[sub.name]}
                  onChange={(v) => onChange(list.map((it, j) => (j === i ? { ...it, [sub.name]: v } : it)))}
                  errors={errors}
                  path={`${path}.${i}.${sub.name}`}
                  mediaCache={mediaCache}
                />
              ))}
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Remove ${def.itemLabel ?? "item"} ${i + 1}`}
              onClick={() => onChange(list.filter((_, j) => j !== i))}
              className="mt-6"
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        {error ? <p className="text-[0.8125rem] text-error">{error}</p> : null}
        {list.length < (def.max ?? 10) ? (
          <div>
            <Button size="sm" variant="secondary" onClick={() => onChange([...list, blank])}>
              <Plus aria-hidden="true" /> Add {def.itemLabel ?? "item"}
            </Button>
          </div>
        ) : null}
      </fieldset>
    );
  }

  let control;
  if (type === "textarea")
    control = (
      <Textarea
        {...common}
        rows={def.rows ?? 4}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  else if (type === "select")
    control = (
      <Select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {def.placeholder ? (
          <option value="" disabled>
            {def.placeholder}
          </option>
        ) : null}
        {(def.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  else if (type === "tags") control = <TagsInput {...common} value={value ?? []} onChange={onChange} />;
  else if (type === "password")
    control = <PasswordInput {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  else if (type === "number")
    control = (
      <Input
        {...common}
        type="number"
        inputMode="decimal"
        step={def.step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    );
  else
    control = (
      <Input {...common} type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    );

  return (
    <Field label={def.label} hint={def.hint} error={error} required={def.required}>
      {control}
    </Field>
  );
}

/**
 * Renders field definitions bound to useZodForm state.
 * @param {{ form: ReturnType<typeof useZodForm>, fields: object[], columns?: 1|2, mediaCache?: Record<string, object> }} props
 */
export function FormBuilder({ form, fields, columns = 2, className, mediaCache }) {
  const { values, set, errors } = form;
  return (
    <div className={cn("grid gap-5", columns === 2 && "md:grid-cols-2", className)}>
      {fields.map((f) => {
        const wide = f.wide || ["richtext", "textarea", "group", "repeater", "media"].includes(f.type);
        return (
          <div key={f.name} className={wide ? "md:col-span-2" : ""}>
            <FieldControl
              def={f}
              value={values[f.name]}
              onChange={(v) => set(f.name, v)}
              errors={errors}
              path={f.name}
              mediaCache={mediaCache}
            />
          </div>
        );
      })}
    </div>
  );
}
