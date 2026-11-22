"use client";

import { ArrowLeft, ArrowRight, Plus, Send, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { readBasket } from "@/lib/client/quoteBasket";
import { cn } from "@/lib/utils";
import { callbackSchema, contactSchema, quoteSchema, sampleSchema } from "@/lib/validation/enquiry";

import { Honeypot, Turnstile } from "./FormSecurity";
import { useEnquiry } from "./useEnquiry";

const TABS = [
  { id: "quote", label: "Request a quote" },
  { id: "sample", label: "Ask for a sample" },
  { id: "callback", label: "Request a callback" },
  { id: "contact", label: "Send a message" },
];
const DOC_TEXT = {
  COA: "the COA (certificate of analysis)",
  SDS: "the SDS (safety data sheet)",
  TDS: "the TDS (technical data sheet)",
};

function ProductSelect({ products, value, onChange, label, error, id }) {
  const groups = useMemo(() => {
    const out = new Map();
    for (const p of products) out.set(p.category, [...(out.get(p.category) ?? []), p]);
    return [...out.entries()];
  }, [products]);
  return (
    <Field label={label} error={error} required id={id}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
      >
        <option value="">Choose a product</option>
        {groups.map(([cat, list]) => (
          <optgroup key={cat} label={cat}>
            {list.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </Field>
  );
}

function Person({ f, phoneRequired = false, cityRequired = false, cityLabel = "City", showCity = true }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Your name" required error={f.errors.name}>
        <Input
          value={f.values.name}
          onChange={(e) => f.set("name", e.target.value)}
          autoComplete="name"
          maxLength={80}
        />
      </Field>
      <Field label="Company" error={f.errors.company}>
        <Input
          value={f.values.company}
          onChange={(e) => f.set("company", e.target.value)}
          autoComplete="organization"
          maxLength={120}
        />
      </Field>
      <Field label="Email" required error={f.errors.email}>
        <Input
          type="email"
          value={f.values.email}
          onChange={(e) => f.set("email", e.target.value)}
          autoComplete="email"
          maxLength={254}
        />
      </Field>
      <Field
        label="Phone"
        required={phoneRequired}
        error={f.errors.phone}
        hint="Mobile or landline, with STD code."
      >
        <Input
          type="tel"
          value={f.values.phone}
          onChange={(e) => f.set("phone", e.target.value)}
          autoComplete="tel"
          maxLength={20}
          inputMode="tel"
        />
      </Field>
      {showCity ? (
        <Field label={cityLabel} required={cityRequired} error={f.errors.city}>
          <Input
            value={f.values.city}
            onChange={(e) => f.set("city", e.target.value)}
            autoComplete="address-level2"
            maxLength={80}
          />
        </Field>
      ) : null}
    </div>
  );
}

function Footer({ f, label = "Send", children }) {
  return (
    <div className="flex flex-col gap-4">
      <Honeypot value={f.honeypot} onChange={f.setHoneypot} />
      <Turnstile onToken={f.setToken} resetKey={f.resetKey} />
      {f.formError ? <Alert tone="error">{f.formError}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <Button type="submit" loading={f.busy}>
          <Send aria-hidden="true" /> {label}
        </Button>
      </div>
      <p className="text-[0.8125rem] text-muted">
        We use your details only to answer this enquiry. No newsletters unless you sign up for them.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ quote (multi-step, todo 03) */

const STEPS = [
  { title: "Products", fields: ["items"] },
  { title: "Delivery", fields: ["city", "message"] },
  { title: "Your details", fields: ["name", "company", "email", "phone"] },
];

function QuoteForm({ products, initialItems, initialMessage }) {
  const f = useEnquiry(quoteSchema, {
    type: "QUOTE",
    items: initialItems.length ? initialItems : [{ slug: "", quantity: "", packSize: "" }],
    name: "",
    company: "",
    email: "",
    phone: "",
    city: "",
    message: initialMessage,
  });
  const [step, setStep] = useState(0);
  const headingRef = useRef(null);
  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);
  const setItem = (i, patch) =>
    f.set(
      "items",
      f.values.items.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    );

  function go(next) {
    if (next > step && !f.check(STEPS[step].fields)) return;
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step < STEPS.length - 1) go(step + 1);
        else f.submit();
      }}
      className="relative flex flex-col gap-6"
      aria-label="Request a quote"
    >
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            aria-current={i === step ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-btn border px-3 py-1.5",
              i === step
                ? "border-primary bg-primary text-primary-ink"
                : i < step
                  ? "border-primary text-primary"
                  : "border-line text-muted",
            )}
          >
            <span className="font-data">{i + 1}</span> {s.title}
          </li>
        ))}
      </ol>
      <h3 ref={headingRef} tabIndex={-1} className="text-h3 outline-none">
        Step {step + 1} of {STEPS.length}: {STEPS[step].title}
      </h3>

      {step === 0 ? (
        <fieldset className="flex flex-col gap-4">
          <legend className="sr-only">Products and quantities</legend>
          {f.values.items.map((it, i) => {
            const packs = bySlug.get(it.slug)?.packSizes ?? [];
            return (
              <div
                key={i}
                className="grid gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-start"
                data-testid="quote-item"
              >
                <ProductSelect
                  products={products}
                  label={`Product ${i + 1}`}
                  value={it.slug}
                  onChange={(v) => setItem(i, { slug: v, packSize: "" })}
                  error={f.errors[`items.${i}.slug`]}
                />
                <Field
                  label="Quantity"
                  required
                  error={f.errors[`items.${i}.quantity`]}
                  hint="e.g. 500 kg, 2 drums"
                >
                  <Input
                    value={it.quantity}
                    onChange={(e) => setItem(i, { quantity: e.target.value })}
                    maxLength={60}
                  />
                </Field>
                <Field label="Pack size">
                  <Select value={it.packSize} onChange={(e) => setItem(i, { packSize: e.target.value })}>
                    <option value="">Any / not sure</option>
                    {packs.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                {f.values.items.length > 1 ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="md:mt-7"
                    aria-label={`Remove product ${i + 1}`}
                    onClick={() =>
                      f.set(
                        "items",
                        f.values.items.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            );
          })}
          {f.errors.items ? <p className="text-[0.8125rem] text-error">{f.errors.items}</p> : null}
          {f.values.items.length < 10 ? (
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => f.set("items", [...f.values.items, { slug: "", quantity: "", packSize: "" }])}
              >
                <Plus aria-hidden="true" /> Add another product
              </Button>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4">
          <Field
            label="Delivery city"
            required
            error={f.errors.city}
            hint="We quote freight to your city separately."
          >
            <Input
              value={f.values.city}
              onChange={(e) => f.set("city", e.target.value)}
              autoComplete="address-level2"
              maxLength={80}
            />
          </Field>
          <Field
            label="Anything else we should know?"
            error={f.errors.message}
            hint="Grade, documents you need, delivery date, monthly use."
          >
            <Textarea
              rows={4}
              value={f.values.message}
              onChange={(e) => f.set("message", e.target.value)}
              maxLength={2000}
            />
          </Field>
        </div>
      ) : null}

      {step === 2 ? <Person f={f} phoneRequired showCity={false} /> : null}

      {step === 2 ? (
        <Footer f={f} label="Send quote request">
          <Button variant="ghost" onClick={() => go(1)}>
            <ArrowLeft aria-hidden="true" /> Back
          </Button>
        </Footer>
      ) : (
        <div className="flex gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => go(step - 1)}>
              <ArrowLeft aria-hidden="true" /> Back
            </Button>
          ) : null}
          <Button type="submit">
            Next: {STEPS[step + 1].title} <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ sample, callback, contact (todos 02, 04, 05) */

function SampleForm({ products, initialSlug }) {
  const f = useEnquiry(sampleSchema, {
    type: "SAMPLE",
    items: [{ slug: initialSlug, quantity: "", packSize: "" }],
    name: "",
    company: "",
    email: "",
    phone: "",
    city: "",
    message: "",
  });
  const item = f.values.items[0];
  return (
    <form
      noValidate
      onSubmit={(e) => (e.preventDefault(), f.submit())}
      className="relative flex flex-col gap-5"
      aria-label="Ask for a sample"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ProductSelect
          products={products}
          label="Product"
          value={item.slug}
          onChange={(v) => f.set("items", [{ ...item, slug: v }])}
          error={f.errors["items.0.slug"] ?? f.errors.items}
        />
        <Field label="Sample size" hint="Usually 250 g to 1 kg, or 500 ml.">
          <Input
            value={item.quantity}
            onChange={(e) => f.set("items", [{ ...item, quantity: e.target.value }])}
            maxLength={60}
          />
        </Field>
      </div>
      <Field
        label="What will you test it for?"
        required
        error={f.errors.message}
        hint="Your product and the batch size you plan, so we send the right grade."
      >
        <Textarea
          rows={3}
          value={f.values.message}
          onChange={(e) => f.set("message", e.target.value)}
          maxLength={1000}
        />
      </Field>
      <Person f={f} phoneRequired cityRequired cityLabel="Delivery city" />
      <Footer f={f} label="Ask for a sample" />
    </form>
  );
}

function CallbackForm() {
  const f = useEnquiry(callbackSchema, {
    type: "CALLBACK",
    name: "",
    phone: "",
    email: "",
    company: "",
    city: "",
    message: "",
  });
  return (
    <form
      noValidate
      onSubmit={(e) => (e.preventDefault(), f.submit())}
      className="relative flex flex-col gap-5"
      aria-label="Request a callback"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={f.errors.name}>
          <Input
            value={f.values.name}
            onChange={(e) => f.set("name", e.target.value)}
            autoComplete="name"
            maxLength={80}
          />
        </Field>
        <Field label="Phone" required error={f.errors.phone}>
          <Input
            type="tel"
            value={f.values.phone}
            onChange={(e) => f.set("phone", e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
          />
        </Field>
        <Field label="Company" error={f.errors.company}>
          <Input
            value={f.values.company}
            onChange={(e) => f.set("company", e.target.value)}
            autoComplete="organization"
            maxLength={120}
          />
        </Field>
        <Field
          label="What is it about?"
          error={f.errors.message}
          hint="Optional, e.g. price of SLES 70%, best time to call."
        >
          <Input
            value={f.values.message}
            onChange={(e) => f.set("message", e.target.value)}
            maxLength={300}
          />
        </Field>
      </div>
      <Footer f={f} label="Call me back" />
    </form>
  );
}

function ContactForm({ initialMessage }) {
  const f = useEnquiry(contactSchema, {
    type: "CONTACT",
    name: "",
    company: "",
    email: "",
    phone: "",
    city: "",
    message: initialMessage,
  });
  return (
    <form
      noValidate
      onSubmit={(e) => (e.preventDefault(), f.submit())}
      className="relative flex flex-col gap-5"
      aria-label="Send a message"
    >
      <Person f={f} />
      <Field label="Message" required error={f.errors.message}>
        <Textarea
          rows={5}
          value={f.values.message}
          onChange={(e) => f.set("message", e.target.value)}
          maxLength={2000}
        />
      </Field>
      <Footer f={f} label="Send message" />
    </form>
  );
}

/* ------------------------------------------------------------------ tabs */

/**
 * The four public forms with tabs that follow the URL hash (#quote, #sample, #callback, #contact),
 * prefilled from ?product=, ?doc= and the "Add to quote" basket.
 * @param {{ products: { slug: string, name: string, category: string, packSizes: string[] }[] }} props
 */
export function EnquiryForms({ products }) {
  const params = useSearchParams();
  const productParam = params.get("product") ?? "";
  const doc = params.get("doc") ?? "";
  const known = products.some((p) => p.slug === productParam) ? productParam : "";
  const [tab, setTab] = useState("quote");
  const [basket, setBasket] = useState(null);
  const tabsId = useId();

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some((t) => t.id === h)) setTab(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  useEffect(() => {
    let live = true;
    readBasket({ fresh: true })
      .then((items) => live && setBasket(items))
      .catch(() => live && setBasket([]));
    return () => {
      live = false;
    };
  }, []);

  const productName = products.find((p) => p.slug === known)?.name;
  const docMessage = DOC_TEXT[doc] && productName ? `Please send ${DOC_TEXT[doc]} for ${productName}.` : "";
  const slugs = [
    ...new Set([known, ...(basket ?? [])].filter((s) => s && products.some((p) => p.slug === s))),
  ];
  const initialItems = slugs.map((slug) => ({ slug, quantity: "", packSize: "" }));

  function select(id) {
    setTab(id);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
  }

  function onKeyDown(e) {
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (i - 1 + TABS.length) % TABS.length
          : null;
    if (next === null) return;
    e.preventDefault();
    select(TABS[next].id);
    document.getElementById(`${tabsId}-${TABS[next].id}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-6" id="quote-forms">
      <div role="tablist" aria-label="Type of enquiry" className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`${tabsId}-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`${tabsId}-${t.id}-panel`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => select(t.id)}
            className={cn(
              "h-10 rounded-btn border px-4 text-sm font-semibold transition-colors",
              tab === t.id
                ? "border-primary bg-primary text-primary-ink"
                : "border-line bg-card text-ink hover:border-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-${tab}-panel`}
        aria-labelledby={`${tabsId}-${tab}`}
        className="rounded-card border border-line bg-card p-5 md:p-8"
      >
        {tab === "quote" ? (
          basket === null ? (
            <p className="text-sm text-muted">Loading the form…</p>
          ) : (
            <QuoteForm
              key={slugs.join()}
              products={products}
              initialItems={initialItems}
              initialMessage={docMessage}
            />
          )
        ) : null}
        {tab === "sample" ? <SampleForm products={products} initialSlug={known} /> : null}
        {tab === "callback" ? <CallbackForm /> : null}
        {tab === "contact" ? <ContactForm initialMessage={docMessage} /> : null}
      </div>
    </div>
  );
}
