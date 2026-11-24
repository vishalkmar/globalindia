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
      className="gi-contact-form relative flex flex-col gap-5"
      aria-label="Ask for a sample"
    >
      <div className="gi-contact-form-heading">
        <h3>Try a sample before you order.</h3>
        <p>Tell us what you are making. We will confirm the right grade, sample size and delivery details.</p>
      </div>
      <div className="gi-contact-field-group grid gap-4 sm:grid-cols-2">
        <ProductSelect
          products={products}
          label="Product"
          value={item.slug}
          onChange={(v) => f.set("items", [{ ...item, slug: v }])}
          error={f.errors["items.0.slug"] ?? f.errors.items}
        />
        <Field label="Sample size" hint="Usually 250 g to 1 kg, or 500 ml.">
          <Input
            placeholder="e.g. 500 g or 500 ml"
            value={item.quantity}
            onChange={(e) => f.set("items", [{ ...item, quantity: e.target.value }])}
            maxLength={60}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field
            label="What will you test it for?"
            required
            error={f.errors.message}
            hint="Your product and the batch size you plan, so we send the right grade."
          >
            <Textarea
              placeholder="Tell us about your application and the trial batch you are planning."
              rows={3}
              value={f.values.message}
              onChange={(e) => f.set("message", e.target.value)}
              maxLength={1000}
            />
          </Field>
        </div>
      </div>
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
      className="gi-contact-form relative flex flex-col gap-5"
      aria-label="Request a callback"
    >
      <div className="gi-contact-form-heading">
        <h3>Let us call you back.</h3>
        <p>
          Leave your number and a convenient time. Our sales team will get in touch during business hours.
        </p>
      </div>
      <div className="gi-contact-field-group grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={f.errors.name}>
          <Input
            placeholder="Your full name"
            value={f.values.name}
            onChange={(e) => f.set("name", e.target.value)}
            autoComplete="name"
            maxLength={80}
          />
        </Field>
        <Field label="Phone" required error={f.errors.phone}>
          <Input
            type="tel"
            placeholder="e.g. 98100 12345"
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
            placeholder="Company or business name"
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
            placeholder="Product, question or preferred call time"
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
      className="gi-contact-form relative flex flex-col gap-5"
      aria-label="Send a message"
    >
      <div className="gi-contact-form-heading">
        <h3>How can we help?</h3>
        <p>Ask us about a product, documents or an existing order. We usually reply the same working day.</p>
      </div>
      <Person f={f} />
      <div className="gi-contact-field-group">
        <Field label="Message" required error={f.errors.message}>
        <Textarea
          rows={5}
          placeholder="Tell us what you need help with. Include a product name or order reference, if you have one."
          value={f.values.message}
          onChange={(e) => f.set("message", e.target.value)}
          maxLength={2000}
        />
        </Field>
      </div>
      <Footer f={f} label="Send message" />
    </form>
  );
}
