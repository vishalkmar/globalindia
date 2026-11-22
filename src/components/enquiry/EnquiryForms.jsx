"use client";

import { ArrowLeft, ArrowRight, Plus, Send, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { readBasket } from "@/lib/client/quoteBasket";
import { cn } from "@/lib/utils";

import { Footer, Person, ProductSelect } from "./FormParts";
import { useEnquiry } from "./useEnquiry";

const loading = () => <p className="text-sm text-muted">Loading the form…</p>;
const SampleForm = dynamic(() => import("./OtherForms").then((m) => m.SampleForm), { loading });
const CallbackForm = dynamic(() => import("./OtherForms").then((m) => m.CallbackForm), { loading });
const ContactForm = dynamic(() => import("./OtherForms").then((m) => m.ContactForm), { loading });

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

/* ------------------------------------------------------------------ quote (multi-step, todo 03) */

const STEPS = [
  { title: "Products", fields: ["items"] },
  { title: "Delivery", fields: ["city", "message"] },
  { title: "Your details", fields: ["name", "company", "email", "phone"] },
];

function QuoteForm({ products, initialItems, initialMessage }) {
  const f = useEnquiry("QUOTE", {
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

  async function go(next) {
    if (next > step && !(await f.check(STEPS[step].fields))) return;
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
