"use client";

import dynamic from "next/dynamic";

/**
 * The enquiry forms read the URL (?product=, #tab), so they render in the browser anyway; loading them
 * as their own chunk keeps /contact's initial JavaScript at the site-wide baseline (Phase 16 todo 17).
 */
export const LazyEnquiryForms = dynamic(() => import("./EnquiryForms").then((m) => m.EnquiryForms), {
  ssr: false,
  loading: () => <p className="text-muted">Loading the form…</p>,
});
