import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Card — white, 1 px border, no shadow. `interactive` adds the hover state from Design.md:
 * border turns primary + 2 px lift. Pass `href` to make the whole card a link.
 */
export function Card({
  as: Tag = "div",
  href,
  interactive = false,
  padding = "md",
  className,
  children,
  ...props
}) {
  const pad = { none: "", sm: "p-5", md: "p-6 md:p-8", lg: "p-8 md:p-10" }[padding];
  const classes = cn(
    "relative rounded-card border border-line bg-card text-ink",
    pad,
    (interactive || href) &&
      "transition-[border-color,transform] duration-150 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-primary motion-reduce:hover:translate-y-0",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cn(classes, "block no-underline")} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}

const badgeTones = {
  neutral: "bg-surface text-ink border-line",
  primary:
    "bg-[color-mix(in_oklab,var(--c-primary)_10%,var(--c-card))] text-primary border-[color-mix(in_oklab,var(--c-primary)_25%,transparent)]",
  accent:
    "bg-[color-mix(in_oklab,var(--c-accent)_12%,var(--c-card))] text-accent-text border-[color-mix(in_oklab,var(--c-accent)_35%,transparent)]",
  success:
    "bg-[color-mix(in_oklab,var(--c-success)_10%,var(--c-card))] text-success border-[color-mix(in_oklab,var(--c-success)_30%,transparent)]",
  error:
    "bg-[color-mix(in_oklab,var(--c-error)_10%,var(--c-card))] text-error border-[color-mix(in_oklab,var(--c-error)_30%,transparent)]",
};

/** Badge — small status label (Draft, Published, New enquiry). */
export function Badge({ tone = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-[4px] border px-2 text-[0.75rem] font-semibold tracking-wide",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Tag — outlined chip for applications, pack sizes, filters. Becomes a link with href. */
export function Tag({ href, active = false, className, children }) {
  const classes = cn(
    "inline-flex h-8 items-center gap-1.5 rounded-btn border px-3 text-sm font-medium",
    active ? "border-primary bg-primary text-primary-ink" : "border-line bg-card text-ink",
    href && !active && "transition-colors hover:border-primary hover:text-primary",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cn(classes, "no-underline")} aria-current={active ? "true" : undefined}>
        {children}
      </Link>
    );
  }
  return <span className={classes}>{children}</span>;
}

/** Divider — 1 px line, optional centred label. */
export function Divider({ label, className }) {
  if (!label) return <hr className={cn("border-0 border-t border-line", className)} />;
  return (
    <div className={cn("flex items-center gap-4", className)} role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-line" />
      <span className="text-label text-muted">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Eyebrow — uppercase label with a 24 px accent line before it. */
export function Eyebrow({ as: Tag = "p", className, children, onBand = false }) {
  return (
    <Tag className={cn("text-eyebrow", onBand && "text-band-ink/85", className)}>
      <span aria-hidden="true" className="inline-block h-px w-6 bg-accent" />
      {children}
    </Tag>
  );
}
