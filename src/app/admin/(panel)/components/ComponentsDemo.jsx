"use client";

import { useState } from "react";
import { z } from "zod";

import { FormBuilder, useZodForm } from "@/components/admin/FormBuilder";
import { SaveBar } from "@/components/admin/SaveBar";
import { SortableList } from "@/components/admin/SortableList";
import { useToast } from "@/components/ui/Feedback";

const schema = z.object({
  name: z.string().trim().min(2, "Enter the product name."),
  casNo: z
    .string()
    .trim()
    .regex(/^$|^\d{2,7}-\d{2}-\d$/, "CAS looks like 8012-95-1."),
  grade: z.string().optional(),
  moq: z.string().trim().min(1, "Enter the minimum order."),
  applications: z.array(z.string()).max(20),
  featured: z.boolean(),
  description: z.string().max(20000),
});

const SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "triad", label: "Feature triad" },
  { id: "about", label: "About teaser" },
  { id: "families", label: "Product families" },
  { id: "faq", label: "FAQ" },
];

export function ComponentsDemo() {
  const toast = useToast();
  const form = useZodForm(schema, {
    name: "Light Liquid Paraffin",
    casNo: "8012-95-1",
    grade: "ip",
    moq: "50 L",
    applications: ["Cosmetics", "Pharma"],
    featured: true,
    description: "<p>We stock Light Liquid Paraffin in 50 L carboys and 210 L drums.</p>",
  });
  const [order, setOrder] = useState(SECTIONS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const orderDirty = order.map((o) => o.id).join() !== SECTIONS.map((o) => o.id).join();

  function fakeSave(kind) {
    const v = form.validate();
    if (!v.ok) return toast.error("Fix the highlighted fields first.");
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedAt(new Date());
      form.markSaved();
      toast.success(
        kind === "publish" ? "Published (demo, nothing stored)." : "Draft saved (demo, nothing stored).",
      );
    }, 600);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-card border border-line bg-card p-6">
        <h2 className="mb-5 text-h4 text-primary">FormBuilder (Zod validated)</h2>
        <FormBuilder
          form={form}
          fields={[
            { name: "name", label: "Product name", required: true },
            { name: "casNo", label: "CAS number", hint: "Leave empty for blends" },
            {
              name: "grade",
              label: "Grade",
              type: "select",
              options: [
                { value: "ip", label: "IP" },
                { value: "usp", label: "USP" },
                { value: "tech", label: "Technical" },
              ],
            },
            { name: "moq", label: "Minimum order", required: true },
            { name: "applications", label: "Applications", type: "tags", wide: true },
            {
              name: "featured",
              label: "Show on home page",
              type: "checkbox",
              hint: "Appears in the featured products section.",
            },
            { name: "description", label: "Description", type: "richtext" },
          ]}
        />
      </section>

      <section className="rounded-card border border-line bg-card p-6">
        <h2 className="mb-1 text-h4 text-primary">Drag to reorder</h2>
        <p className="mb-5 text-sm text-muted">
          Mouse, touch, or keyboard: focus a handle, press space, use arrow keys, press space.
        </p>
        <SortableList items={order} onReorder={setOrder} className="max-w-md" />
      </section>

      <SaveBar
        dirty={form.dirty || orderDirty}
        saving={saving}
        status="DRAFT"
        savedAt={savedAt}
        onSaveDraft={() => fakeSave("draft")}
        onPublish={() => fakeSave("publish")}
        onPreview={() =>
          toast.info("Preview opens the public page with unpublished changes (pages arrive in Phase 10).")
        }
      />
    </div>
  );
}
