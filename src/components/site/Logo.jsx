import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Logo from Admin > Settings > Header. Falls back to the text logo when no image is uploaded.
 * `onDark` uses the dark-background logo (footer).
 */
export function Logo({ chrome, onDark = false, className, priority = false }) {
  const asset = onDark ? (chrome.logo.dark ?? null) : (chrome.logo.light ?? null);
  const text = chrome.header.logoText || chrome.business.name;
  return (
    <Link href="/" className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      {asset ? (
        <Image
          src={asset.url}
          alt={asset.alt || chrome.business.name}
          width={asset.width ?? 200}
          height={asset.height ?? 60}
          priority={priority}
          sizes="200px"
          className="h-10 w-auto max-w-[200px] object-contain"
        />
      ) : (
        <>
          {/* The monogram letter is CSS content, so the link's visible text equals its accessible name. */}
          <span
            aria-hidden="true"
            data-mark={text.charAt(0)}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-[calc(var(--r-btn)+2px)] font-display text-xl leading-none before:content-[attr(data-mark)]",
              onDark
                ? "bg-band-ink text-band shadow-[0_6px_16px_-6px_rgb(0_0_0/0.5)]"
                : "bg-[linear-gradient(150deg,color-mix(in_oklab,var(--c-primary)_80%,white),var(--c-primary)_55%)] text-primary-ink shadow-primary " +
                    "ring-1 ring-inset ring-[color-mix(in_oklab,var(--c-accent)_45%,transparent)]",
            )}
          />
          <span
            className={cn(
              "font-display text-[1.375rem] leading-none tracking-[-0.01em]",
              onDark ? "text-band-ink" : "text-primary",
            )}
          >
            {text}
          </span>
        </>
      )}
    </Link>
  );
}
