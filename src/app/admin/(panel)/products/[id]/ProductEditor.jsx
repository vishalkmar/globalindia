"use client";

import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProductDocumentsField, ProductGalleryField } from "@/components/admin/catalogue/ProductMediaFields";
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
import { EMPTY_CONTENT, productSchema, slugify } from "@/lib/validation/catalogue";

const EMPTY = {
  name: "",
  slug: "",
  categoryId: "",
  casNo: "",
  grade: "",
  purity: "",
  form: "",
  packSizes: [],
  moq: "",
  shelfLife: "",
  dispatchTime: "Usually within 7 working days",
  applications: [],
  summary: "",
  specs: [],
  content: EMPTY_CONTENT,
  faqs: [],
  brandNote: "",
  isSourced: true,
  showPrice: false,
  indicativePrice: "",
  featured: false,
  status: "DRAFT",
  seo: { title: "", description: "", noindex: false },
  imageId: null,
  gallery: [],
  documents: [],
};

function groups({ categories, isNew, canPublish, showPrice }) {
  return [
    {
      id: "basics",
      title: "Basics",
      fields: [
        { name: "name", label: "Product name", required: true, maxLength: 120 },
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
          name: "categoryId",
          label: "Category",
          type: "select",
          required: true,
          placeholder: "Choose a category",
          options: categories.map((c) => ({ value: c.id, label: c.name })),
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
          name: "casNo",
          label: "CAS number",
          maxLength: 12,
          placeholder: "e.g. 57-55-6",
          hint: "Leave empty for blends and finished products. The check digit is verified.",
        },
        { name: "grade", label: "Grade", maxLength: 80, placeholder: "e.g. IP / USP, Food grade" },
        { name: "purity", label: "Purity / assay", maxLength: 60, placeholder: "e.g. 99.5% min" },
        { name: "form", label: "Form", maxLength: 80, placeholder: "e.g. White powder, Clear liquid" },
      ],
    },
    {
      id: "buying",
      title: "Buying details",
      fields: [
        {
          name: "packSizes",
          label: "Pack sizes",
          type: "tags",
          wide: true,
          placeholder: "e.g. 25 kg bag, 200 L drum (Enter after each)",
        },
        { name: "moq", label: "Minimum order", maxLength: 60, placeholder: "e.g. 50 kg" },
        { name: "shelfLife", label: "Shelf life", maxLength: 60, placeholder: "e.g. 24 months" },
        { name: "dispatchTime", label: "Dispatch time", maxLength: 80, wide: true },
      ],
    },
    {
      id: "about",
      title: "About the product",
      fields: [
        {
          name: "summary",
          label: "Summary",
          type: "textarea",
          rows: 3,
          maxLength: 600,
          hint: "One short paragraph: what it is and what buyers use it for. Plain words, no claims you cannot back up.",
        },
        {
          name: "applications",
          label: "Applications",
          type: "tags",
          wide: true,
          placeholder: "e.g. Shampoo, Dishwash liquid",
        },
      ],
    },
    {
      id: "guide",
      title: "Buyer's guide (product page)",
      fields: [
        {
          name: "content",
          label: "Long content",
          type: "group",
          columns: 1,
          hint: "Anything you leave empty is written for you from the product data. Plain text; leave a blank line between paragraphs.",
          fields: [
            { name: "whatIsIt", label: "What is it?", type: "textarea", rows: 4, maxLength: 2000 },
            {
              name: "howMade",
              label: "How it is made or sourced",
              type: "textarea",
              rows: 4,
              maxLength: 2000,
            },
            {
              name: "industries",
              label: "Applications by industry",
              type: "repeater",
              itemLabel: "industry",
              max: 12,
              fields: [
                { name: "industry", label: "Industry", maxLength: 60 },
                { name: "use", label: "How it is used", maxLength: 240 },
              ],
            },
            {
              name: "askSupplier",
              label: "Questions to ask the supplier",
              type: "repeater",
              itemLabel: "question",
              max: 12,
              fields: [
                { name: "question", label: "Question", maxLength: 160 },
                { name: "why", label: "Why it matters", maxLength: 300 },
              ],
            },
            { name: "storage", label: "Storage and handling", type: "textarea", rows: 3, maxLength: 1500 },
            {
              name: "pricingFactors",
              label: "Supply and pricing factors",
              type: "repeater",
              itemLabel: "factor",
              max: 10,
              fields: [
                { name: "factor", label: "Factor", maxLength: 80 },
                { name: "effect", label: "Effect on price or supply", maxLength: 300 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "specs",
      title: "Specifications",
      fields: [
        {
          name: "specs",
          label: "Specification table",
          type: "repeater",
          itemLabel: "row",
          max: 40,
          hint: "Typical values. The website always reminds buyers to confirm against the batch COA.",
          fields: [
            { name: "property", label: "Property", maxLength: 80 },
            { name: "value", label: "Value", maxLength: 160 },
            { name: "method", label: "Test method (optional)", maxLength: 80 },
          ],
        },
      ],
    },
    {
      id: "faqs",
      title: "Questions buyers ask",
      fields: [
        {
          name: "faqs",
          label: "FAQs",
          type: "repeater",
          itemLabel: "question",
          max: 20,
          fields: [
            { name: "q", label: "Question", maxLength: 200 },
            { name: "a", label: "Answer", type: "textarea", rows: 3, maxLength: 1200 },
          ],
        },
      ],
    },
    {
      id: "images",
      title: "Images",
      fields: [
        {
          name: "imageId",
          label: "Main image",
          type: "media",
          folder: "products",
          hint: "Shown on product cards and at the top of the product page.",
        },
      ],
      custom: "gallery",
    },
    { id: "documents", title: "Documents", fields: [], custom: "documents" },
    {
      id: "brand",
      title: "Brand, sourcing and price",
      fields: [
        {
          name: "brandNote",
          label: "Brand note",
          maxLength: 200,
          wide: true,
          placeholder: "e.g. We supply Godrej SLES 70%.",
          hint: "Always worded as “We supply …”: we are a supplier, not the manufacturer.",
        },
        {
          name: "isSourced",
          label: "Sourced from a producer",
          type: "checkbox",
          hint: "Untick for products we blend or pack ourselves.",
        },
        { name: "featured", label: "Feature on the home page", type: "checkbox" },
        {
          name: "showPrice",
          label: "Show an indicative price",
          type: "checkbox",
          hint: "Off by default: prices are quoted on request.",
        },
        ...(showPrice
          ? [
              {
                name: "indicativePrice",
                label: "Indicative price",
                maxLength: 60,
                placeholder: "e.g. ₹ 145 / kg + GST (Nov 2026)",
              },
            ]
          : []),
      ],
    },
    {
      id: "seo",
      title: "Search engines",
      fields: [
        {
          name: "seo",
          label: "Search result",
          type: "group",
          hint: "Leave empty to use the product name and summary.",
          fields: [
            { name: "title", label: "Page title", maxLength: 70 },
            { name: "description", label: "Description", maxLength: 170, wide: true },
            { name: "noindex", label: "Hide this page from search engines", type: "checkbox", wide: true },
          ],
        },
      ],
    },
  ];
}

/** Product editor (Phase 12 todos 05-13, 15-16). */
export function ProductEditor({ productId, categories, perms }) {
  const isNew = !productId;
  const [loaded, setLoaded] = useState(isNew ? { product: EMPTY, path: null } : null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isNew) return undefined;
    let live = true;
    adminJson(`/api/admin/products/${productId}`).then((res) => {
      if (!live) return;
      if (!res.ok)
        return setError(
          res.status === 404
            ? "This product does not exist or was deleted."
            : (res.data?.error ?? "Could not load the product."),
        );
      setLoaded(res.data);
    });
    return () => {
      live = false;
    };
  }, [productId, isNew]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!loaded) return <Skeleton className="h-96" />;
  return (
    <Form
      key={productId ?? "new"}
      productId={productId}
      initial={loaded.product}
      initialPath={loaded.path}
      categories={categories}
      perms={perms}
    />
  );
}

function Form({ productId, initial, initialPath, categories, perms }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !productId;
  const base = useZodForm(productSchema, initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [path, setPath] = useState(initialPath);
  const [live, setLive] = useState(initial.status === "PUBLISHED");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  // Navigate only after the unsaved-changes guard has been released (it traps history while dirty).
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
    if (!check.ok) {
      const first = Object.keys(check.errors)[0];
      return setError(`Please fix the highlighted fields${first ? ` (first: ${first})` : ""}.`);
    }
    setSaving(true);
    setError("");
    const res = await adminJson(isNew ? "/api/admin/products" : `/api/admin/products/${productId}`, {
      method: isNew ? "POST" : "PUT",
      json: check.data,
    });
    setSaving(false);
    if (!res.ok) {
      base.setErrors(res.data?.fields ?? {});
      return setError(res.data?.error ?? "Could not save.");
    }
    toast.success(isNew ? "Product created." : "Product saved.");
    if (isNew) {
      base.markSaved(check.data);
      return setGoTo(`/admin/products/${res.data.id}`);
    }
    base.markSaved(res.data.product);
    setPath(res.data.path);
    setLive(res.data.product.status === "PUBLISHED");
    setSavedAt(new Date());
  }

  async function duplicate() {
    const res = await adminJson(`/api/admin/products/${productId}/duplicate`, { method: "POST" });
    if (!res.ok) return toast.error(res.data?.error ?? "Could not duplicate.");
    toast.success("Draft copy created. You are now editing the copy.");
    router.push(`/admin/products/${res.data.id}`);
  }

  async function remove() {
    const res = await adminJson(`/api/admin/products/${productId}`, { method: "DELETE" });
    setConfirmDelete(false);
    if (!res.ok) return toast.error(res.data?.error ?? "Could not delete.");
    toast.success("Product deleted. Its old address now leads to the category page.");
    setGoTo("/admin/products");
  }

  const sections = groups({ categories, isNew, canPublish: perms.publish, showPrice: base.values.showPrice });
  return (
    <>
      <PageHeader
        title={isNew ? "New product" : initial.name}
        description={path ?? "Add a product to the catalogue."}
        actions={
          <>
            {live && path ? (
              <Button href={path} variant="secondary" size="sm" target="_blank">
                <ExternalLink aria-hidden="true" /> View on website
              </Button>
            ) : null}
            {!isNew && perms.create ? (
              <Button variant="secondary" size="sm" onClick={duplicate}>
                <Copy aria-hidden="true" /> Duplicate
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
      <fieldset disabled={!perms.update} className="flex flex-col gap-5">
        <legend className="sr-only">Product details</legend>
        {sections.map((g) => (
          <section
            key={g.id}
            aria-labelledby={`sec-${g.id}`}
            className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 md:p-6"
          >
            <h2 id={`sec-${g.id}`} className="font-display text-lg text-primary">
              {g.title}
            </h2>
            {g.fields.length ? <FormBuilder form={form} fields={g.fields} /> : null}
            {g.custom === "gallery" ? (
              <ProductGalleryField
                value={base.values.gallery}
                onChange={(v) => base.set("gallery", v)}
                errors={base.errors}
                disabled={!perms.update}
              />
            ) : null}
            {g.custom === "documents" ? (
              <ProductDocumentsField
                value={base.values.documents}
                onChange={(v) => base.set("documents", v)}
                errors={base.errors}
                disabled={!perms.update}
              />
            ) : null}
          </section>
        ))}
      </fieldset>
      {perms.update ? (
        <SaveBar
          dirty={base.dirty && !goTo}
          saving={saving}
          savedAt={savedAt}
          onPublish={save}
          publishLabel={isNew ? "Create product" : "Save product"}
          onHistory={isNew ? undefined : () => setHistory(true)}
        />
      ) : null}
      {!isNew ? (
        <RevisionHistory
          open={history}
          onClose={() => setHistory(false)}
          entity="product"
          entityId={productId}
          onRestore={(data) => {
            base.load({ ...EMPTY, ...data, slug: base.values.slug, status: base.values.status });
            toast.info("Older version loaded (URL slug and status are kept). Save to make it live.");
          }}
        />
      ) : null}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this product?"
        description="It disappears from the website and its address redirects to the category page. Files stay in the media library."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button onClick={remove}>Delete product</Button>
          </>
        }
      />
    </>
  );
}
