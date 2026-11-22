"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductChecklist } from "@/components/admin/catalogue/ProductChecklist";
import { STATUS_OPTIONS } from "@/components/admin/catalogue/StatusBadge";
import { PageHeader } from "@/components/admin/EmptyState";
import { FormBuilder, useZodForm } from "@/components/admin/FormBuilder";
import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { SaveBar } from "@/components/admin/SaveBar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { ICON_OPTIONS } from "@/lib/sections/icons";
import { slugify } from "@/lib/validation/catalogue";
import { industrySchema } from "@/lib/validation/content";

const EMPTY = {
  name: "",
  slug: "",
  icon: "factory",
  summary: "",
  content: { intro: "", needs: [] },
  faqs: [],
  productIds: [],
  imageId: null,
  status: "DRAFT",
  seo: { title: "", description: "", noindex: false },
};

const fields = (canPublish) => [
  { name: "name", label: "Industry name", required: true, maxLength: 80 },
  {
    name: "slug",
    label: "URL slug",
    required: true,
    maxLength: 80,
    hint: "Changing it adds a redirect from the old address.",
  },
  { name: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, disabled: !canPublish },
  {
    name: "summary",
    label: "One-line summary",
    type: "textarea",
    rows: 2,
    maxLength: 240,
    hint: "Shown on the industry cards.",
  },
  { name: "imageId", label: "Image (optional)", type: "media", folder: "pages" },
  {
    name: "content",
    label: "Page content",
    type: "group",
    columns: 1,
    fields: [
      { name: "intro", label: "Introduction", type: "textarea", rows: 4, maxLength: 1500 },
      {
        name: "needs",
        label: "What buyers in this industry need",
        type: "repeater",
        itemLabel: "need",
        max: 8,
        sortable: true,
        fields: [
          { name: "title", label: "Title", maxLength: 80 },
          { name: "text", label: "Text", maxLength: 300 },
        ],
      },
    ],
  },
  {
    name: "faqs",
    label: "Questions buyers ask",
    type: "repeater",
    itemLabel: "question",
    max: 20,
    sortable: true,
    fields: [
      { name: "q", label: "Question", maxLength: 200 },
      { name: "a", label: "Answer", type: "textarea", rows: 3, maxLength: 1200 },
    ],
  },
  {
    name: "seo",
    label: "Search engines",
    type: "group",
    fields: [
      { name: "title", label: "Page title", maxLength: 70 },
      { name: "description", label: "Description", maxLength: 170, wide: true },
      { name: "noindex", label: "Hide from search engines", type: "checkbox", wide: true },
    ],
  },
];

/** Industry page editor (Phase 15 todos 02, 18-19). */
export function IndustryEditor({ industryId, products, perms }) {
  const [initial, setInitial] = useState(industryId ? null : EMPTY);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!industryId) return undefined;
    let live = true;
    adminJson(`/api/admin/industries/${industryId}`).then((r) => {
      if (!live) return;
      if (!r.ok)
        return setError(
          r.status === 404 ? "This industry does not exist." : (r.data?.error ?? "Could not load."),
        );
      setInitial(r.data.industry);
    });
    return () => {
      live = false;
    };
  }, [industryId]);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!initial) return <Skeleton className="h-96" />;
  return <Form industryId={industryId} initial={initial} products={products} perms={perms} />;
}

function Form({ industryId, initial, products, perms }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !industryId;
  const base = useZodForm(industrySchema, initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [goTo, setGoTo] = useState(null);
  useEffect(() => {
    if (goTo) router.replace(goTo);
  }, [goTo, router]);

  const form = {
    ...base,
    set: (name, value) => {
      base.set(name, value);
      if (name === "name" && !slugTouched) base.set("slug", slugify(value));
      if (name === "slug") setSlugTouched(true);
    },
  };

  async function save() {
    const check = base.validate();
    if (!check.ok) return setError("Please fix the highlighted fields.");
    setSaving(true);
    setError("");
    const r = await adminJson(isNew ? "/api/admin/industries" : `/api/admin/industries/${industryId}`, {
      method: isNew ? "POST" : "PUT",
      json: check.data,
    });
    setSaving(false);
    if (!r.ok) {
      base.setErrors(r.data?.fields ?? {});
      return setError(r.data?.error ?? "Could not save.");
    }
    base.markSaved(check.data);
    setSavedAt(new Date());
    toast.success(isNew ? "Industry page created." : "Industry page saved.");
    if (isNew) setGoTo(`/admin/industries/${r.data.id}`);
  }

  async function remove() {
    const r = await adminJson(`/api/admin/industries/${industryId}`, { method: "DELETE" });
    setConfirm(false);
    if (!r.ok) return toast.error(r.data?.error ?? "Could not delete.");
    toast.success("Industry page deleted.");
    setGoTo("/admin/industries");
  }

  return (
    <>
      <PageHeader
        title={isNew ? "New industry page" : initial.name}
        description={isNew ? "Add an industry you supply." : `/industries/${initial.slug}`}
        actions={
          <>
            {!isNew && initial.status === "PUBLISHED" ? (
              <Button href={`/industries/${initial.slug}`} variant="secondary" size="sm" target="_blank">
                <ExternalLink aria-hidden="true" /> View on website
              </Button>
            ) : null}
            {!isNew && perms.delete ? (
              <Button variant="ghost" size="sm" className="text-error" onClick={() => setConfirm(true)}>
                <Trash2 aria-hidden="true" /> Delete
              </Button>
            ) : null}
          </>
        }
      />
      {error ? (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      ) : null}
      <fieldset
        disabled={!perms.update}
        className="flex flex-col gap-5 rounded-card border border-line bg-card p-5 md:p-6"
      >
        <legend className="sr-only">Industry page</legend>
        <FormBuilder form={form} fields={fields(perms.publish)} />
        <ProductChecklist
          products={products}
          value={base.values.productIds}
          onChange={(ids) => base.set("productIds", ids)}
          error={base.errors.productIds}
          disabled={!perms.update}
        />
      </fieldset>
      {perms.update ? (
        <SaveBar
          dirty={base.dirty && !goTo}
          saving={saving}
          savedAt={savedAt}
          onPublish={save}
          publishLabel={isNew ? "Create page" : "Save page"}
          onHistory={isNew ? undefined : () => setHistory(true)}
        />
      ) : null}
      {!isNew ? (
        <RevisionHistory
          open={history}
          onClose={() => setHistory(false)}
          entity="industry"
          entityId={industryId}
          onRestore={(data) => {
            base.load({ ...EMPTY, ...data, slug: base.values.slug, status: base.values.status });
            toast.info("Older version loaded. Save to make it live.");
          }}
        />
      ) : null}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this industry page?"
        description="It is removed from the website. Products are not affected."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={remove}>Delete page</Button>
          </>
        }
      />
    </>
  );
}
