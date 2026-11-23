/* Server-compatible feedback primitives (no hooks). */
import { CircleAlert, CircleCheck, Info } from "lucide-react";

import { cn } from "@/lib/utils";

/* ---------------- IconBox ---------------- */

/**
 * IconBox — lucide icon (stroke 1.5) inside a 44 px square with a 1 px border.
 * Never a coloured circle (Design.md §5).
 * @param {{ icon: import('react').ComponentType<any>, size?: 'md'|'lg', onBand?: boolean, label?: string }} props
 */
export function IconBox({ icon: Icon, size = "md", onBand = false, label, className }) {
  const box = size === "lg" ? "size-14" : "size-11";
  const icon = size === "lg" ? "size-6" : "size-5";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[calc(var(--r-btn)+2px)]",
        onBand
          ? "bg-[color-mix(in_oklab,var(--c-band-ink)_10%,transparent)] text-band-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--c-band-ink)_18%,transparent)]"
          : "bg-[linear-gradient(145deg,color-mix(in_oklab,var(--c-primary)_14%,var(--c-card)),color-mix(in_oklab,var(--c-accent)_20%,var(--c-card)))] text-primary",
        box,
        className,
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Icon className={icon} strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}

/* ---------------- Skeleton ---------------- */

export function Skeleton({ className, lines = 0 }) {
  if (lines > 0) {
    return (
      <div className={cn("flex flex-col gap-2.5", className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="skeleton h-3.5" style={{ width: i === lines - 1 ? "62%" : "100%" }} />
        ))}
      </div>
    );
  }
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}

/* ---------------- Alert (inline) ---------------- */

export const tones = {
  info: { icon: Info, cls: "border-line bg-surface text-ink [&_svg]:text-primary" },
  success: {
    icon: CircleCheck,
    cls: "border-[color-mix(in_oklab,var(--c-success)_35%,transparent)] bg-[color-mix(in_oklab,var(--c-success)_8%,var(--c-card))] text-ink [&_svg]:text-success",
  },
  error: {
    icon: CircleAlert,
    cls: "border-[color-mix(in_oklab,var(--c-error)_35%,transparent)] bg-[color-mix(in_oklab,var(--c-error)_7%,var(--c-card))] text-ink [&_svg]:text-error",
  },
};

export function Alert({ tone = "info", title, children, className }) {
  const { icon: Icon, cls } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-card border px-4 py-3.5 text-sm", cls, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" strokeWidth={1.75} />
      <div className="flex flex-col gap-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed text-ink/90">{children}</div> : null}
      </div>
    </div>
  );
}
