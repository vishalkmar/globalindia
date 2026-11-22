"use client";

import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

/**
 * 6-digit code input. One field (paste and password managers work), numeric keyboard on phones,
 * autocomplete="one-time-code" so iOS/Android can fill codes from SMS/email.
 * Calls onComplete when 6 digits are present.
 */
export function CodeInput({ value, onChange, onComplete, className, autoFocus = true, ...props }) {
  return (
    <Input
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      autoFocus={autoFocus}
      placeholder="000000"
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
        onChange(digits);
        if (digits.length === 6) onComplete?.(digits);
      }}
      className={cn(
        "h-14 text-center font-data text-2xl tracking-[0.5em] placeholder:tracking-[0.5em] placeholder:text-muted/40",
        className,
      )}
      {...props}
    />
  );
}
