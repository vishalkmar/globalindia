"use client";

import dynamic from "next/dynamic";

/**
 * The footer newsletter form loads after the page is interactive, in its own small chunk, so it is not
 * part of every page's initial JavaScript (Phase 16 todo 17). The placeholder has the same size.
 */
function Placeholder() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <p className="text-sm font-semibold">Monthly price and stock notes</p>
      <div className="flex gap-2">
        <span className="h-10 min-w-0 flex-1 rounded-btn border border-[color-mix(in_oklab,var(--c-band-ink)_35%,transparent)]" />
        <span className="h-10 w-24 rounded-btn bg-band-ink/15" />
      </div>
      <p className="min-h-5 text-[0.8125rem] text-band-ink/75">
        One email a month at most. Unsubscribe any time.
      </p>
    </div>
  );
}

const NewsletterForm = dynamic(() => import("./NewsletterForm").then((m) => m.NewsletterForm), {
  ssr: false,
  loading: Placeholder,
});

export function FooterNewsletter() {
  return <NewsletterForm />;
}
