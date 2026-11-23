"use client";

import { Package, ShieldCheck, Truck } from "lucide-react";
import { useId, useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { Card, Eyebrow } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/Static";
import { themeToCss } from "@/lib/theme/css";

/**
 * Live preview of unsaved theme tokens (Phase 8 todo 12). The tokens are printed as CSS variables
 * scoped to this box only, so the rest of the admin keeps its own look. Uses the real site components.
 */
export function ThemePreview({ tokens, mode = "light", className }) {
  const scope = `tp-${useId()
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()}`;
  const css = useMemo(() => themeToCss(tokens, `.${scope}`), [tokens, scope]);

  return (
    <div className={className}>
      {/* Safe: themeToCss validates every value (hex colours, whitelisted fonts, clamped numbers). */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className={`${scope} overflow-hidden surface-card bg-bg font-body text-ink`}
        data-theme={mode}
        style={{ fontSize: 15 }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line bg-bg px-4 py-3">
          <span className="font-display text-lg text-primary">Global India</span>
          <span className="hidden gap-4 text-[0.8125rem] font-semibold text-ink sm:flex">
            <span className="border-b-2 border-accent pb-0.5">Products</span>
            <span>Industries</span>
            <span>About</span>
          </span>
          <Button size="sm">Request a quote</Button>
        </div>

        <div className="flex flex-col gap-3 bg-surface px-5 py-8">
          <Eyebrow>Chemical raw materials · Delhi · Since 2002</Eyebrow>
          <p className="font-display text-[1.75rem] leading-tight text-primary">
            Raw materials for food, cosmetics and cleaning products.
          </p>
          <p className="max-w-md text-muted">
            We pack in 25 kg and 50 kg bags, 50 L cans and 200 L drums, and dispatch across India within about
            a week.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm">Request a quote</Button>
            <Button size="sm" variant="secondary">
              See all products
            </Button>
          </div>
        </div>

        <div className="grid gap-3 bg-bg p-5 sm:grid-cols-3">
          {[
            { icon: Package, t: "One supplier" },
            { icon: Truck, t: "India-wide dispatch" },
            { icon: ShieldCheck, t: "Clear paperwork" },
          ].map((c) => (
            <Card key={c.t} padding="sm" className="flex flex-col gap-2">
              <IconBox icon={c.icon} />
              <span className="font-semibold text-primary">{c.t}</span>
              <span className="text-[0.8125rem] text-muted">GST invoice and COA with every batch.</span>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 border-y border-line bg-bg px-5 py-4">
          {[
            ["2002", "Established"],
            ["120+", "Products"],
            ["35", "People"],
          ].map(([v, l]) => (
            <div key={l} className="border-l border-accent pl-3">
              <div className="font-display text-xl text-accent-text">{v}</div>
              <div className="text-[0.75rem] text-muted">{l}</div>
            </div>
          ))}
        </div>

        <div className="bg-band px-5 py-6 text-band-ink">
          <Eyebrow onBand>Ready to order</Eyebrow>
          <p className="mt-2 font-display text-xl">Tell us the product, grade and quantity.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="onBand">
              Request a quote
            </Button>
            <Button size="sm" variant="onBandOutline">
              Call us
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between bg-band px-5 py-3 font-data text-[0.75rem] text-band-ink/70">
          <span>GSTIN 07BMMPA5592C1Z4</span>
          <span>CAS 8012-95-1</span>
        </div>
      </div>
    </div>
  );
}

/** Four-colour swatch used in theme lists. */
export function ThemeSwatch({ tokens, mode = "light" }) {
  const c = tokens?.colors?.[mode] ?? {};
  return (
    <span className="flex overflow-hidden rounded-btn shadow-[inset_0_0_0_1px_var(--hairline)]" aria-hidden="true">
      {[c.primary, c.accent, c.surface, c.ink].map((hex, i) => (
        <span
          key={i}
          className="h-8 flex-1"
          style={{ background: /^#[0-9a-f]{6}$/i.test(hex ?? "") ? hex : "transparent" }}
        />
      ))}
    </span>
  );
}
