"use client";

import { Check, ChevronDown, CircleAlert, Eye, EyeOff } from "lucide-react";
import { cloneElement, isValidElement, useId, useState } from "react";

import { cn } from "@/lib/utils";

const control =
  "w-full rounded-btn border border-[color-mix(in_oklab,var(--c-ink)_12%,transparent)] " +
  "bg-[color-mix(in_oklab,var(--c-surface)_45%,var(--c-card))] text-ink placeholder:text-muted/75 " +
  "shadow-[inset_0_1px_2px_color-mix(in_oklab,var(--c-ink)_5%,transparent)] " +
  "transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-[color-mix(in_oklab,var(--c-ink)_24%,transparent)] " +
  "focus:border-primary focus:bg-card focus:outline-none " +
  "focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--c-primary)_14%,transparent)] " +
  "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70 " +
  "aria-invalid:border-error aria-invalid:focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--c-error)_14%,transparent)]";

/**
 * Field: label + control + hint + error, wired with ids for screen readers.
 * The child control receives id, aria-describedby, aria-invalid and required automatically.
 */
export function Field({ label, hint, error, required, className, children, id: idProp }) {
  const autoId = useId();
  const id = idProp ?? `f${autoId.replace(/:/g, "")}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const child = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        required: required || children.props.required,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-label text-ink">
          {label}
          {required ? (
            <span className="ml-0.5 text-error" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {child}
      {hint && !error ? (
        <p id={hintId} className="text-[0.8125rem] leading-snug text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-[0.8125rem] leading-snug text-error"
        >
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, size = "md", ...props }) {
  return (
    <input
      className={cn(control, size === "sm" ? "h-9 px-3 text-sm" : "h-12 px-4 text-[0.9375rem]", className)}
      {...props}
    />
  );
}

/**
 * Password input with a show/hide toggle. id and aria-* props go to the <input> itself,
 * so <Field> labels and error messages stay correctly linked.
 */
export function PasswordInput({ className, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        className={cn("pr-11", className)}
        maxLength={128}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
      >
        {show ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}

export function Textarea({ className, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn(control, "min-h-28 px-4 py-3 text-[0.9375rem] leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, placeholder, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(control, "h-12 appearance-none pr-10 pl-4 text-[0.9375rem]", className)}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        strokeWidth={1.75}
      />
    </div>
  );
}

/** Checkbox with a visible custom box; native input stays for accessibility. */
export function Checkbox({ label, description, className, id: idProp, ...props }) {
  const autoId = useId();
  const id = idProp ?? `c${autoId.replace(/:/g, "")}`;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span className="relative mt-0.5 inline-flex size-5 shrink-0">
        <input
          id={id}
          type="checkbox"
          className={cn(
            "peer size-5 cursor-pointer appearance-none rounded-[4px] border border-[color-mix(in_oklab,var(--c-line)_40%,var(--c-muted))] bg-card",
            "checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          className="pointer-events-none absolute inset-0.5 size-4 text-primary-ink opacity-0 peer-checked:opacity-100"
          strokeWidth={2.5}
        />
      </span>
      {label ? (
        <label htmlFor={id} className="cursor-pointer text-[0.9375rem] leading-snug">
          <span className="font-medium text-ink">{label}</span>
          {description ? <span className="mt-0.5 block text-sm text-muted">{description}</span> : null}
        </label>
      ) : null}
    </div>
  );
}

/** Radio group rendered as a fieldset. options: [{value,label,description}] */
export function RadioGroup({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  className,
  inline = false,
}) {
  const autoId = useId();
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      {legend ? <legend className="mb-1.5 text-label text-ink">{legend}</legend> : null}
      <div className={cn("flex gap-3", inline ? "flex-row flex-wrap gap-x-6" : "flex-col")}>
        {options.map((opt) => {
          const id = `r${autoId.replace(/:/g, "")}-${opt.value}`;
          return (
            <div key={opt.value} className="flex items-start gap-3">
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.value}
                checked={value !== undefined ? value === opt.value : undefined}
                defaultChecked={defaultValue !== undefined ? defaultValue === opt.value : undefined}
                onChange={onChange}
                className={cn(
                  "mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-full border border-[color-mix(in_oklab,var(--c-line)_40%,var(--c-muted))] bg-card",
                  "checked:border-[6px] checked:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                )}
              />
              <label htmlFor={id} className="cursor-pointer text-[0.9375rem] leading-snug">
                <span className="font-medium text-ink">{opt.label}</span>
                {opt.description ? (
                  <span className="mt-0.5 block text-sm text-muted">{opt.description}</span>
                ) : null}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
