import { cn } from "@/lib/utils";

/** Max-width container (1240 px) with 16/24 px gutters. */
export function Container({ as: Tag = "div", className, children, ...props }) {
  return (
    <Tag className={cn("container-site", className)} {...props}>
      {children}
    </Tag>
  );
}

const tones = {
  white: "bg-bg",
  surface: "bg-surface",
  band: "bg-band text-band-ink [&_h1]:text-band-ink [&_h2]:text-band-ink [&_h3]:text-band-ink",
};

/**
 * Full-width section band with standard vertical rhythm (96 px desktop / 64 px mobile).
 * Alternate `tone="white"` and `tone="surface"` down a page; `band` is the dark CTA/footer style.
 */
export function Section({
  as: Tag = "section",
  tone = "white",
  spacing = "default",
  className,
  children,
  ...props
}) {
  const space = { default: "section-y", tight: "py-12 md:py-16", none: "" }[spacing];
  return (
    <Tag className={cn(tones[tone], space, className)} {...props}>
      {children}
    </Tag>
  );
}

/** Section heading block: eyebrow + H2 + intro paragraph, left or centre aligned. */
export function SectionHeading({ eyebrow, title, intro, align = "left", as: H = "h2", className, children }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "mx-auto items-center text-center" : "",
        "max-w-3xl",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-eyebrow">
          <span aria-hidden="true" className="inline-block h-px w-6 bg-accent" />
          {eyebrow}
        </p>
      ) : null}
      {title ? <H className="text-h2">{title}</H> : null}
      {intro ? <p className="measure text-lead">{intro}</p> : null}
      {children}
    </div>
  );
}

/** 12-column grid helper. Children use col-span-* classes. */
export function Grid({ className, children, ...props }) {
  return (
    <div className={cn("grid-site gap-y-6 md:gap-y-8", className)} {...props}>
      {children}
    </div>
  );
}
