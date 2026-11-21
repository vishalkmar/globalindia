import {
  Beaker,
  Car,
  Droplet,
  Factory,
  FlaskConical,
  Package,
  Pill,
  ShieldCheck,
  Truck,
  Utensils,
  WashingMachine,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Badge, Card, Divider, Eyebrow, Tag } from "@/components/ui/Card";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import { CountUp, Reveal } from "@/components/ui/Motion";
import { Alert, IconBox, Skeleton } from "@/components/ui/Static";
import { Table } from "@/components/ui/Table";
import { checkPairs } from "@/lib/theme/contrast";
import { COLOR_TOKENS, CONTRAST_PAIRS, THEME_PRESETS } from "@/lib/theme/presets";

import { StyleguideInteractive } from "./StyleguideInteractive";

export const metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

/** Dev-only component gallery (Phase 2 todo 19). Hidden in production unless ENABLE_STYLEGUIDE=true. */
export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "true") notFound();

  const preset = THEME_PRESETS[0];
  const contrast = checkPairs(preset.tokens.colors.light, CONTRAST_PAIRS);

  return (
    <main id="main">
      <Section tone="surface" spacing="tight" className="border-b border-line">
        <Container className="flex flex-col gap-3">
          <Eyebrow>Design system</Eyebrow>
          <h1 className="text-display">Global India styleguide</h1>
          <p className="text-lead measure">
            Every base component with the active theme tokens. Change the theme in the admin panel and this page follows.
          </p>
        </Container>
      </Section>

      {/* Colours */}
      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeading eyebrow="01 Colour" title="Three colours and neutrals" intro="Primary carries the brand, accent is only for thin lines and small highlights, surface separates sections." />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {COLOR_TOKENS.map((t) => (
              <div key={t.key} className="overflow-hidden rounded-card border border-line bg-card">
                <div className="h-20 border-b border-line" style={{ background: `var(--c-${t.key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)})` }} />
                <div className="flex flex-col gap-0.5 p-3">
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-data text-[0.75rem] text-muted">{preset.tokens.colors.light[t.key]}</span>
                </div>
              </div>
            ))}
          </div>
          <Table
            caption="Contrast check"
            columns={[
              { key: "pair", label: "Pair" },
              { key: "use", label: "Used for" },
              { key: "ratio", label: "Ratio", data: true, align: "right" },
              { key: "result", label: "AA", align: "right" },
            ]}
            rows={contrast.map((r) => ({
              id: `${r.fg}-${r.bg}`,
              pair: `${r.fg} on ${r.bg}`,
              use: r.use,
              ratio: `${r.ratio.toFixed(2)} : 1`,
              result: r.pass ? <Badge tone="success">Pass</Badge> : <Badge tone="error">Fail</Badge>,
            }))}
            note="Text pairs need 4.5:1, non-text accents need 3:1. The script npm run check:contrast checks all presets in light and dark."
          />
        </Container>
      </Section>

      {/* Typography */}
      <Section tone="surface">
        <Container className="flex flex-col gap-8">
          <SectionHeading eyebrow="02 Typography" title="Type scale" />
          <div className="flex flex-col gap-6 rounded-card border border-line bg-card p-6 md:p-10">
            <p className="text-display">Raw materials, supplied without the run-around.</p>
            <p className="text-h2">Twenty-four years of supplying the people who make things.</p>
            <p className="text-h3">Pack sizes that match real orders</p>
            <Eyebrow>Chemical raw materials · Delhi · Since 2002</Eyebrow>
            <p className="text-body measure">
              We stock Light Liquid Paraffin in 50 L carboys and 210 L drums. Viscosity and grade are confirmed on the COA that travels with every batch.
            </p>
            <p className="text-small text-muted">Small / label text — 14 px, used for captions and meta.</p>
            <p className="text-data">CAS 8012-95-1 · MOQ 50 L · Purity 99.5%</p>
          </div>
        </Container>
      </Section>

      {/* Buttons, badges, tags */}
      <Section>
        <Container className="flex flex-col gap-8">
          <SectionHeading eyebrow="03 Actions" title="Buttons, badges and tags" />
          <div className="flex flex-wrap items-center gap-3">
            <Button>Request a quote</Button>
            <Button variant="secondary">See all products</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link" href="/styleguide">Text link</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Draft</Badge>
            <Badge tone="primary">Published</Badge>
            <Badge tone="accent">Featured</Badge>
            <Badge tone="success">Replied</Badge>
            <Badge tone="error">Spam</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tag>25 kg bag</Tag>
            <Tag>50 kg bag</Tag>
            <Tag>200 L drum</Tag>
            <Tag href="/styleguide" active>
              All families
            </Tag>
            <Tag href="/styleguide">Food ingredients</Tag>
          </div>
          <Divider label="Divider with label" />
        </Container>
      </Section>

      {/* Cards + icons */}
      <Section tone="surface">
        <Container className="flex flex-col gap-8">
          <SectionHeading eyebrow="04 Cards and icons" title="Cards with bordered icon squares" />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Package, title: "One supplier, many raw materials", text: "Buy your surfactants, glycols, paraffins and food additives from one desk." },
              { icon: Truck, title: "Delhi stock, India-wide dispatch", text: "Orders usually leave our Burari Road warehouse within seven working days." },
              { icon: ShieldCheck, title: "Clear paperwork", text: "GST invoice, COA and safety data sheets travel with the material where applicable." },
            ].map((c) => (
              <Card key={c.title} interactive className="flex flex-col gap-4">
                <IconBox icon={c.icon} />
                <h3 className="text-h3">{c.title}</h3>
                <p className="text-muted">{c.text}</p>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {[Utensils, Droplet, Pill, WashingMachine, Factory, FlaskConical, Car, Beaker].map((Icon, i) => (
              <IconBox key={i} icon={Icon} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 rounded-card bg-band p-6">
            {[Utensils, Droplet, Pill, Factory].map((Icon, i) => (
              <IconBox key={i} icon={Icon} onBand />
            ))}
            <Button variant="onBand">Request a quote</Button>
            <Button variant="onBandOutline">Call +91 80717 79152</Button>
          </div>
        </Container>
      </Section>

      {/* Table */}
      <Section>
        <Container className="flex flex-col gap-8">
          <SectionHeading eyebrow="05 Data" title="Specification table" />
          <Table
            caption="Light Liquid Paraffin — indicative specification"
            columns={[
              { key: "property", label: "Property" },
              { key: "value", label: "Typical value", data: true },
              { key: "method", label: "Method", data: true },
            ]}
            rows={[
              { property: "Appearance", value: "Clear, colourless liquid", method: "Visual" },
              { property: "Kinematic viscosity at 40 °C", value: "25–80 cSt", method: "ASTM D445" },
              { property: "Density at 25 °C", value: "0.83–0.87 g/mL", method: "ASTM D4052" },
              { property: "Odour", value: "Odourless", method: "Sensory" },
              { property: "Acidity", value: "Passes IP test", method: "IP" },
            ]}
            note="Confirm the exact specification on the COA supplied with your batch."
          />
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { v: 2002, s: "", l: "Year established", year: true },
              { v: 120, s: "+", l: "Products in stock" },
              { v: 35, s: "", l: "People on the team" },
              { v: 22, s: "", l: "Product categories" },
            ].map((s) => (
              <div key={s.l} className="flex flex-col gap-1 border-l border-accent pl-4">
                <CountUp value={s.v} suffix={s.s} group={!s.year} className="text-h2 text-accent-text" />
                <span className="text-small text-muted">{s.l}</span>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Feedback */}
      <Section tone="surface">
        <Container className="flex flex-col gap-6">
          <SectionHeading eyebrow="06 Feedback" title="Alerts and skeletons" />
          <Alert title="Quote request received">We will reply with a written quote, usually the same working day.</Alert>
          <Alert tone="success" title="Saved">Product updated and published.</Alert>
          <Alert tone="error" title="Could not send">Check the highlighted fields and try again.</Alert>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-card border border-line bg-card p-6">
              <Skeleton className="size-11" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton lines={3} />
            </div>
          </div>
        </Container>
      </Section>

      {/* Interactive */}
      <Section>
        <Container>
          <StyleguideInteractive />
        </Container>
      </Section>

      <Section tone="band">
        <Container>
          <Reveal className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3">
              <Eyebrow onBand>Ready to order</Eyebrow>
              <p className="text-h2">Tell us the product, grade and quantity.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="onBand" size="lg">
                Request a quote
              </Button>
              <Button variant="onBandOutline" size="lg">
                Call us
              </Button>
            </div>
          </Reveal>
        </Container>
      </Section>
    </main>
  );
}
