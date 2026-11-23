"use client";

import { useEffect, useState } from "react";

import { FormBuilder, useZodForm } from "@/components/admin/FormBuilder";
import { SaveBar } from "@/components/admin/SaveBar";
import { useToast } from "@/components/ui/Feedback";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";

/**
 * Edit an ordered list as a whole (FAQs, testimonials, client logos — Phase 15). One sortable repeater,
 * validated with the same schema as the API, saved with one PUT.
 * @param {{ endpoint: string, schema: import('zod').ZodType, field: object, canEdit: boolean, savedText: string }} props
 */
export function CollectionEditor({ endpoint, schema, field, canEdit, savedText }) {
  const [initial, setInitial] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    adminJson(endpoint).then((r) => {
      if (!live) return;
      if (!r.ok) return setError(r.data?.error ?? "Could not load the list.");
      setInitial({ items: r.data.items });
    });
    return () => {
      live = false;
    };
  }, [endpoint]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!initial) return <Skeleton className="h-96" />;
  return (
    <Form
      endpoint={endpoint}
      schema={schema}
      field={field}
      canEdit={canEdit}
      savedText={savedText}
      initial={initial}
    />
  );
}

function Form({ endpoint, schema, field, canEdit, savedText, initial }) {
  const toast = useToast();
  const form = useZodForm(schema, initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  async function save() {
    const check = form.validate();
    if (!check.ok) return setError("Please fix the highlighted fields.");
    setSaving(true);
    setError("");
    const r = await adminJson(endpoint, { method: "PUT", json: check.data });
    setSaving(false);
    if (!r.ok) {
      form.setErrors(r.data?.fields ?? {});
      return setError(r.data?.error ?? "Could not save.");
    }
    form.markSaved({ items: r.data.items });
    setSavedAt(new Date());
    toast.success(savedText);
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <fieldset disabled={!canEdit} className="surface-card p-5">
        <legend className="sr-only">{field.label}</legend>
        <FormBuilder form={form} fields={[{ ...field, name: "items", sortable: true }]} columns={1} />
      </fieldset>
      {canEdit ? (
        <SaveBar dirty={form.dirty} saving={saving} savedAt={savedAt} onPublish={save} publishLabel="Save" />
      ) : null}
    </div>
  );
}
