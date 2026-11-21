import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** tailwind-merge that knows our custom type-scale utilities so they merge correctly. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-lead",
        "text-body",
        "text-small",
        "text-label",
        "text-data",
        "text-eyebrow",
      ],
    },
  },
});

/** Join class names conditionally and resolve Tailwind conflicts. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Format a number for display in Indian English (e.g. 1,20,000). */
export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** Bytes to a short human string. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
