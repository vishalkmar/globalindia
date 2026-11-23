import Link from "@/components/ui/SmartLink";
import { cn } from "@/lib/utils";

/**
 * Card — elevated surface: soft shadow and a hairline ring, no hard border (UI phase).
 * `interactive` (or `href`) adds a gentle lift and a deeper shadow on hover.
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
    "surface-card relative text-ink",
    pad,
    (interactive || href) && "lift",
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
        "inline-flex h-6 items-center gap-1 rounded-pill border px-2.5 text-[0.75rem] font-semibold tracking-wide",
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
    "inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-sm font-medium transition-[background-color,box-shadow,color] duration-200",
    active
      ? "bg-primary text-primary-ink shadow-primary"
      : "bg-card text-ink shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)]",
    href && !active && "hover:text-primary hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-primary)_35%,transparent),var(--sh-sm)]",
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
      <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" />
      {children}
    </Tag>
  );
}
