"use client";

import {
  clientLogoListSchema,
  FAQ_TOPICS,
  faqListSchema,
  testimonialListSchema,
} from "@/lib/validation/content";

import { CollectionEditor } from "./CollectionEditor";

/** Admin > FAQ (Phase 15 todo 08). */
export function FaqsEditor({ canEdit }) {
  return (
    <CollectionEditor
      endpoint="/api/admin/faqs"
      schema={faqListSchema}
      canEdit={canEdit}
      savedText="FAQ saved. The FAQ page is updated."
      field={{
        label: "Questions",
        type: "repeater",
        itemLabel: "question",
        max: 100,
        hint: "Shown on the FAQ page, grouped by topic, in this order.",
        fields: [
          {
            name: "topic",
            label: "Topic",
            type: "select",
            default: "General",
            options: FAQ_TOPICS.map((t) => ({ value: t, label: t })),
          },
          { name: "isVisible", label: "Show on the website", type: "checkbox", default: true },
          { name: "question", label: "Question", maxLength: 200, wide: true },
          { name: "answer", label: "Answer", type: "textarea", rows: 3, maxLength: 1200, wide: true },
        ],
      }}
    />
  );
}

/** Admin > Testimonials (Phase 15 todo 14). Real customers only: no invented quotes. */
export function TestimonialsEditor({ canEdit }) {
  return (
    <CollectionEditor
      endpoint="/api/admin/testimonials"
      schema={testimonialListSchema}
      canEdit={canEdit}
      savedText="Testimonials saved."
      field={{
        label: "Testimonials",
        type: "repeater",
        itemLabel: "testimonial",
        max: 40,
        hint: "Only add what a real customer said, with their permission. The home page section hides itself while this list is empty.",
        fields: [
          { name: "quote", label: "What they said", type: "textarea", rows: 3, maxLength: 600 },
          { name: "name", label: "Name", maxLength: 80 },
          { name: "role", label: "Role", maxLength: 80 },
          { name: "company", label: "Company", maxLength: 120 },
          { name: "city", label: "City", maxLength: 60 },
          { name: "isVisible", label: "Show on the website", type: "checkbox", default: true },
        ],
      }}
    />
  );
}

/** Admin > Client logos (Phase 15 todo 15). Only logos you have permission to show. */
export function ClientLogosEditor({ canEdit }) {
  return (
    <CollectionEditor
      endpoint="/api/admin/client-logos"
      schema={clientLogoListSchema}
      canEdit={canEdit}
      savedText="Client logos saved."
      field={{
        label: "Client logos",
        type: "repeater",
        itemLabel: "logo",
        max: 60,
        hint: "Show a customer's logo only with their permission. The home page strip hides itself while this list is empty.",
        fields: [
          { name: "name", label: "Company name", maxLength: 80 },
          { name: "url", label: "Website (optional)", placeholder: "https://", maxLength: 300 },
          { name: "mediaId", label: "Logo", type: "media", folder: "logos" },
          { name: "isVisible", label: "Show on the website", type: "checkbox", default: true },
        ],
      }}
    />
  );
}
