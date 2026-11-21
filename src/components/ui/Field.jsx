"use client";

import { Check, ChevronDown, CircleAlert } from "lucide-react";
import { cloneElement, isValidElement, useId } from "react";

import { cn } from "@/lib/utils";

const control =
  "w-full rounded-btn border border-line bg-card text-ink placeholder:text-muted/80 " +
  "transition-[border-color,box-shadow] duration-150 " +
  "hover:border-[color-mix(in_oklab,var(--c-line)_50%,var(--c-ink))] " +
  "focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent " +
  "disabled:cursor-not-allowed disabled:bg-surface disabled:opacity-70 " +
  "aria-invalid:border-error aria-invalid:focus-visible:outline-error";

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
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[0.8125rem] leading-snug text-error">
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
      className={cn(control, size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-3.5 text-[0.9375rem]", className)}
      {...props}
    />
  );
}

export function Textarea({ className, rows = 4, ...props }) {
  return (
    <textarea rows={rows} className={cn(control, "min-h-24 px-3.5 py-2.5 text-[0.9375rem] leading-relaxed", className)} {...props} />
  );
}

export function Select({ className, children, placeholder, ...props }) {
  return (
    <div className="relative">
      <select className={cn(control, "h-11 appearance-none pr-10 pl-3.5 text-[0.9375rem]", className)} {...props}>
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
export function RadioGroup({ legend, name, options, value, defaultValue, onChange, className, inline = false }) {
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
                {opt.description ? <span className="mt-0.5 block text-sm text-muted">{opt.description}</span> : null}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
