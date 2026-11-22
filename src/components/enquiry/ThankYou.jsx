"use client";

import { CheckCircle2, Phone } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { clearBasket } from "@/lib/client/quoteBasket";

const NEXT = {
  quote: [
    "We check stock, grade and the best pack for your quantity.",
    "You get a written quote by email or WhatsApp, usually the same working day.",
    "Once you confirm, we raise the invoice and dispatch, usually within 7 working days.",
  ],
  sample: [
    "We confirm the grade and sample size with you.",
    "The sample goes by courier with its COA.",
    "Test it at your end; we hold the price for the period in the quote.",
  ],
  callback: [
    "Someone from our sales desk will call you during business hours.",
    "Keep the product name and quantity handy so we can quote on the call.",
  ],
  contact: [
    "Your message is with our sales desk.",
    "We reply by email or phone, usually the same working day.",
  ],
};
const TITLE = {
  quote: "quote request",
  sample: "sample request",
  callback: "callback request",
  contact: "message",
};

export function ThankYouBody({ phone, phoneHref }) {
  const params = useSearchParams();
  const type = NEXT[params.get("type")] ? params.get("type") : "contact";
  const ref = /^GI-[A-Z0-9]{6}$/.test(params.get("ref") ?? "") ? params.get("ref") : null;

  useEffect(() => {
    if (type === "quote") clearBasket().catch(() => {});
  }, [type]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <CheckCircle2 aria-hidden="true" className="size-10 text-success" strokeWidth={1.5} />
      <h1 className="text-display">Thank you. We have your {TITLE[type]}.</h1>
      {ref ? (
        <p className="text-lead">
          Your reference is <strong className="font-data text-primary">{ref}</strong>. Quote it if you call
          us.
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        <h2 className="text-h3">What happens next</h2>
        <ol className="flex flex-col gap-3">
          {NEXT[type].map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="font-data text-accent-text">{String(i + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button href="/products">Browse more products</Button>
        {phone ? (
          <Button href={phoneHref} variant="secondary">
            <Phone aria-hidden="true" /> {phone}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
