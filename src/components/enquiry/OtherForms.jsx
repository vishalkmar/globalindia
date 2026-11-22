"use client";

import { Field, Input, Textarea } from "@/components/ui/Field";

import { Footer, Person, ProductSelect } from "./FormParts";
import { useEnquiry } from "./useEnquiry";

/** Sample, callback and message forms: loaded only when their tab is opened (Phase 16 todo 17). */

export function SampleForm({ products, initialSlug }) {
  const f = useEnquiry("SAMPLE", {
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

export function CallbackForm() {
  const f = useEnquiry("CALLBACK", {
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

export function ContactForm({ initialMessage }) {
  const f = useEnquiry("CONTACT", {
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
