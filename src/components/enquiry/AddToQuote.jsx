"use client";

import { Check, ListPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { addToBasket, onBasketChange, readBasket } from "@/lib/client/quoteBasket";

/**
 * "Add to quote" (Phase 14 todo 15): collect several products, then send one quote request for all
 * of them. Stores product slugs only. Works as a plain link to the quote form before hydration.
 */
export function AddToQuote({ slug }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let live = true;
    readBasket()
      .then((list) => live && setItems(list))
      .catch(() => live && setItems([]));
    const off = onBasketChange((list) => setItems(list));
    return () => {
      live = false;
      off();
    };
  }, []);

  const added = items?.includes(slug);
  const count = items?.length ?? 0;

  async function add() {
    setBusy(true);
    try {
      const res = await addToBasket(slug);
      setNote(res.full ? "Your quote list is full (10 products). Send it first, then add more." : "");
    } catch {
      setNote("Could not add it. Please use “Request quotation” instead.");
    } finally {
      setBusy(false);
    }
  }

  if (items === null) {
    return (
      <Button href={`/contact?product=${slug}#quote`} variant="secondary" size="lg">
        <ListPlus aria-hidden="true" /> Add to quote
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {added ? (
        <Button href="/contact#quote" variant="secondary" size="lg">
          <Check aria-hidden="true" /> In your quote ({count}) — send it
        </Button>
      ) : (
        <Button variant="secondary" size="lg" onClick={add} loading={busy}>
          <ListPlus aria-hidden="true" /> Add to quote{count ? ` (${count})` : ""}
        </Button>
      )}
      <p className="text-[0.8125rem] text-muted" role="status">
        {note ||
          (added && count > 1 ? (
            <>
              {count} products in your quote list.{" "}
              <Link href="/products" className="underline underline-offset-2">
                Add more
              </Link>{" "}
              or send it.
            </>
          ) : null)}
      </p>
    </div>
  );
}
