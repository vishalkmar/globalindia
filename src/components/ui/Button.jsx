import { LoaderCircle } from "lucide-react";

import Link from "@/components/ui/SmartLink";
import { cn } from "@/lib/utils";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-semibold tracking-[-0.005em] " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-standard)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 " +
  "select-none [&_svg]:shrink-0 [&_svg:last-child:not(:first-child)]:transition-transform [&_svg:last-child:not(:first-child)]:duration-200 " +
  "motion-safe:hover:[&_svg:last-child:not(:first-child)]:translate-x-0.5";

const lift = "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0";

const variants = {
  primary:
    "bg-primary text-primary-ink shadow-primary " +
    "bg-[linear-gradient(180deg,color-mix(in_oklab,var(--c-primary)_88%,white)_0%,var(--c-primary)_100%)] " +
    "hover:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--c-primary)_80%,white)_0%,color-mix(in_oklab,var(--c-primary)_92%,white)_100%)] " +
    lift,
  secondary:
    "bg-card text-primary shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)] hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--c-primary)_35%,transparent),var(--sh-sm)] " +
    lift,
  ghost: "bg-transparent text-ink hover:bg-[color-mix(in_oklab,var(--c-ink)_5%,transparent)]",
  link: "h-auto! px-0! bg-transparent text-primary underline decoration-1 underline-offset-4 hover:decoration-2",
  onBand:
    "bg-band-ink text-band shadow-[0_8px_24px_-8px_rgb(0_0_0/0.45)] hover:bg-[color-mix(in_oklab,var(--c-band-ink)_90%,var(--c-band))] " +
    lift,
  onBandOutline:
    "bg-[color-mix(in_oklab,var(--c-band-ink)_6%,transparent)] text-band-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--c-band-ink)_35%,transparent)] hover:bg-[color-mix(in_oklab,var(--c-band-ink)_12%,transparent)]",
  danger:
    "bg-error text-white shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--c-error)_60%,transparent)] hover:bg-[color-mix(in_oklab,var(--c-error)_88%,black)] " +
    lift,
};

const sizes = {
  sm: "h-9 px-4 text-[0.875rem] [&_svg]:size-4",
  md: "h-11 px-5.5 text-[0.9375rem] [&_svg]:size-[18px]",
  lg: "h-13 px-7 text-base [&_svg]:size-5",
  icon: "size-10 p-0 [&_svg]:size-5",
};

/**
 * Button / link-button.
 * - Pass `href` to render a Next.js Link (internal) or <a> (external, opens safely).
 * - `loading` shows a spinner, sets aria-busy and blocks clicks.
 */
export function Button({
  variant = "primary",
  size = "md",
  href,
  external = false,
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...props
}) {
  const classes = cn(base, variants[variant], sizes[size], className);
  props["data-btn"] = variant; // lets the theme switch primary buttons to an outline style
  const content = (
    <>
      {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" strokeWidth={2} /> : null}
      {children}
    </>
  );

  if (href) {
    if (/^(tel|mailto):/i.test(href)) {
      return (
        <a href={href} className={classes} {...props}>
          {content}
        </a>
      );
    }
    if (external) {
      return (
        <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
          {content}
        </a>
      );
    }
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        // New tabs never get a handle on this window (tabnabbing, Phase 29 todo 03).
        rel={props.target === "_blank" ? "noopener noreferrer" : props.rel}
        {...props}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}
