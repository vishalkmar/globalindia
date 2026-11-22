"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { cn, formatNumber } from "@/lib/utils";

/** Wrap any block to fade it up as it scrolls into view (CSS view timeline, see globals.css "Motion"). */
export function Reveal({ as: Tag = "div", className, children, ...props }) {
  return (
    <Tag data-reveal className={className} {...props}>
      {children}
    </Tag>
  );
}

/**
 * Animated number. Server HTML always contains the real value; screen readers get the final value only.
 * @param {{ value: number, suffix?: string, prefix?: string, group?: boolean }} props  group=false for years
 */
export function CountUp({ value, suffix = "", prefix = "", group = true, className }) {
  const { ref, value: shown } = useCountUp(value);
  const fmt = (n) => (group ? formatNumber(n) : String(n));
  const final = `${prefix}${fmt(value)}${suffix}`;
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      <span aria-hidden="true">
        {prefix}
        {fmt(shown)}
        {suffix}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
