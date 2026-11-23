"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { STATUS_OPTIONS } from "@/components/admin/catalogue/StatusBadge";
import { PageHeader } from "@/components/admin/EmptyState";
import { FormBuilder, useZodForm } from "@/components/admin/FormBuilder";
import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { SaveBar } from "@/components/admin/SaveBar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Alert, Skeleton } from "@/components/ui/Static";
import { FAMILIES } from "@/lib/catalogue/families";
import { adminJson } from "@/lib/client/adminFetch";
import { categorySchema, slugify } from "@/lib/validation/catalogue";

const EMPTY = {
  name: "",
  slug: "",
  family: "",
  intro: "",
  guide: "",
  faqs: [],
  imageId: null,
  status: "DRAFT",
  seo: { title: "", description: "", noindex: false },
};

const fields = (isNew, canPublish) => [
  { name: "name", label: "Category name", required: true, maxLength: 80 },
  {
    name: "slug",
    label: "URL slug",
    required: true,
    maxLength: 80,
    hint: isNew
      ? "Filled from the name; you can change it."
      : "Changing it adds a redirect from the old address automatically.",
  },
  {
    name: "family",
    label: "Family",
    type: "select",
    required: true,
    placeholder: "Choose a family",
    options: FAMILIES.map((f) => ({ value: f.key, label: f.name })),
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: STATUS_OPTIONS,
    disabled: !canPublish,
    hint: canPublish ? undefined : "Only a publisher can change this.",
  },
  {
    name: "intro",
    label: "Short introduction",
    type: "textarea",
    rows: 3,
    maxLength: 600,
    hint: "Shown under the title on the category page and on the products page. Two or three plain sentences.",
  },
  {
    name: "imageId",
    label: "Category image",
    type: "media",
    folder: "categories",
    hint: "Optional. A real photo of the material or packs.",
  },
  {
    name: "guide",
    label: "Buying guide",
    type: "richtext",
    hint: "What buyers should check before ordering: grades, packs, storage, documents.",
  },
  {
    name: "faqs",
    label: "Questions buyers ask",
    type: "repeater",
    itemLabel: "question",
    max: 20,
    fields: [
      { name: "q", label: "Question", maxLength: 200 },
      { name: "a", label: "Answer", type: "textarea", rows: 3, maxLength: 1200 },
    ],
  },
  {
    name: "seo",
    label: "Search engines",
    type: "group",
    hint: "Leave empty to use the category name and introduction.",
    fields: [
      { name: "title", label: "Page title", maxLength: 70 },
      { name: "description", label: "Description", maxLength: 170, wide: true },
      { name: "noindex", label: "Hide this page from search engines", type: "checkbox", wide: true },
    ],
  },
];

/** Category editor (Phase 12 todo 03). */
export function CategoryEditor({ categoryId, perms }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !categoryId;
  const [loaded, setLoaded] = useState(isNew ? { category: EMPTY, productCount: 0 } : null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return undefined;
    let live = true;
    adminJson(`/api/admin/categories/${categoryId}`).then((res) => {
      if (!live) return;
      if (!res.ok)
        return setError(
          res.status === 404
            ? "This category does not exist or was deleted."
            : (res.data?.error ?? "Could not load the category."),
        );
      setLoaded(res.data);
    });
    return () => {
      live = false;
    };
  }, [categoryId, isNew]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!loaded) return <Skeleton className="h-96" />;
  return (
    <Form
      key={categoryId ?? "new"}
      categoryId={categoryId}
      initial={loaded.category}
      productCount={loaded.productCount}
      perms={perms}
      router={router}
      toast={toast}
    />
  );
}

function Form({ categoryId, initial, productCount, perms, router, toast }) {
  const isNew = !categoryId;
  const base = useZodForm(categorySchema, initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  // Navigate only after the unsaved-changes guard has been released (it traps history while dirty).
  const [goTo, setGoTo] = useState(null);
  useEffect(() => {
    if (goTo) router.replace(goTo);
  }, [goTo, router]);

  // New category: the slug follows the name until the editor types their own.
  const form = {
    ...base,
    set: (name, value) => {
      base.set(name, value);
      if (name === "name" && !slugTouched) base.set("slug", slugify(value));
      if (name === "slug") setSlugTouched(true);
    },
  };

  async function save() {
    const check = form.validate();
    if (!check.ok) return setError("Please fix the highlighted fields.");
    setSaving(true);
    setError("");
    const res = await adminJson(isNew ? "/api/admin/categories" : `/api/admin/categories/${categoryId}`, {
      method: isNew ? "POST" : "PUT",
      json: check.data,
    });
    setSaving(false);
    if (!res.ok) {
      form.setErrors(res.data?.fields ?? {});
      return setError(res.data?.error ?? "Could not save.");
    }
    base.markSaved(check.data);
    setSavedAt(new Date());
    toast.success(isNew ? "Category created." : "Category saved.");
    if (isNew) setGoTo(`/admin/categories/${res.data.id}`);
  }

  async function remove() {
    const res = await adminJson(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
    setConfirmDelete(false);
    if (!res.ok) return toast.error(res.data?.error ?? "Could not delete.");
    toast.success("Category deleted.");
    setGoTo("/admin/categories");
  }

  const live = initial.status === "PUBLISHED" && !isNew;
  return (
    <>
      <PageHeader
        title={isNew ? "New category" : initial.name}
        description={
          isNew
            ? "Add a product category."
            : `/products/${initial.slug} · ${productCount === 1 ? "1 product" : `${productCount} products`}`
        }
        actions={
          <>
            {live ? (
              <Button href={`/products/${initial.slug}`} variant="secondary" size="sm" target="_blank">
                <ExternalLink aria-hidden="true" /> View on website
              </Button>
            ) : null}
            {!isNew && perms.delete ? (
              <Button variant="ghost" size="sm" className="text-error" onClick={() => setConfirmDelete(true)}>
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
      <fieldset disabled={!perms.update} className="surface-card p-5 md:p-6">
        <legend className="sr-only">Category details</legend>
        <FormBuilder form={form} fields={fields(isNew, perms.publish)} />
      </fieldset>
      {perms.update ? (
        <SaveBar
          dirty={base.dirty && !goTo}
          saving={saving}
          savedAt={savedAt}
          onPublish={save}
          publishLabel={isNew ? "Create category" : "Save category"}
          onHistory={isNew ? undefined : () => setHistory(true)}
        />
      ) : null}
      {!isNew ? (
        <RevisionHistory
          open={history}
          onClose={() => setHistory(false)}
          entity="category"
          entityId={categoryId}
          onRestore={(data) => {
            form.load({ ...initial, ...data, slug: form.values.slug });
            toast.info("Older version loaded (the URL slug is kept). Save to make it live.");
          }}
        />
      ) : null}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this category?"
        description={
          productCount
            ? `It still has ${productCount} product(s). Move them to another category first.`
            : "It is removed from the website. This cannot be undone from here."
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button onClick={remove} disabled={productCount > 0}>
              Delete category
            </Button>
          </>
        }
      />
    </>
  );
}
