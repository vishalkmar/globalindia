import { LoaderCircle } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-btn font-semibold " +
  "transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-standard)] " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 " +
  "select-none [&_svg]:shrink-0";

const variants = {
  primary:
    "bg-primary text-primary-ink border border-primary hover:bg-[color-mix(in_oklab,var(--c-primary)_86%,black)] active:translate-y-px",
  secondary:
    "bg-transparent text-primary border border-primary hover:bg-[color-mix(in_oklab,var(--c-primary)_7%,transparent)] active:translate-y-px",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-surface",
  link: "h-auto! px-0! border-0 bg-transparent text-primary underline decoration-1 underline-offset-4 hover:decoration-2",
  onBand:
    "bg-band-ink text-band border border-band-ink hover:bg-[color-mix(in_oklab,var(--c-band-ink)_88%,var(--c-band))] active:translate-y-px",
  onBandOutline:
    "bg-transparent text-band-ink border border-[color-mix(in_oklab,var(--c-band-ink)_55%,transparent)] hover:border-band-ink",
  danger: "bg-error text-white border border-error hover:bg-[color-mix(in_oklab,var(--c-error)_86%,black)]",
};

const sizes = {
  sm: "h-9 px-3.5 text-[0.875rem] [&_svg]:size-4",
  md: "h-11 px-5 text-[0.9375rem] [&_svg]:size-[18px]",
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
