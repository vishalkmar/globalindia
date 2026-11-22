"use client";

import { useEffect, useState } from "react";

import { FormBuilder, useZodForm } from "@/components/admin/FormBuilder";
import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { SaveBar } from "@/components/admin/SaveBar";
import { SETTINGS_FIELDS } from "@/components/admin/settings/fields";
import { useToast } from "@/components/ui/Feedback";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { SETTING_DEFAULTS, SETTINGS } from "@/lib/settings/schemas";

function Editor({ settingKey, initial, media, updatedAt, canEdit }) {
  const toast = useToast();
  const form = useZodForm(SETTINGS[settingKey].schema, initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(updatedAt ? new Date(updatedAt) : null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(false);
  const cfg = SETTINGS_FIELDS[settingKey];

  async function save() {
    const v = form.validate();
    if (!v.ok) {
      setError("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await adminJson(`/api/admin/settings/${settingKey}`, { method: "PUT", json: v.data });
    setSaving(false);
    if (!res.ok) {
      form.setErrors(res.data?.fields ?? {});
      setError(res.data?.error ?? "Could not save.");
      return;
    }
    form.markSaved(res.data.value);
    setSavedAt(new Date(res.data.updatedAt));
    toast.success(`${SETTINGS[settingKey].label} saved. The website shows the change now.`);
  }

  return (
    <div className="flex flex-col gap-6">
      {!canEdit ? <Alert tone="info">Your role can view these settings but not change them.</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <fieldset
        disabled={!canEdit}
        className="rounded-card border border-line bg-card p-6 disabled:opacity-80"
      >
        <FormBuilder form={form} fields={cfg.fields} mediaCache={media} />
      </fieldset>
      {canEdit ? (
        <SaveBar
          dirty={form.dirty}
          saving={saving}
          savedAt={savedAt}
          onPublish={save}
          publishLabel="Save and publish"
          onHistory={() => setHistory(true)}
        />
      ) : null}
      <RevisionHistory
        open={history}
        onClose={() => setHistory(false)}
        entity="settings"
        entityId={settingKey}
        onRestore={(data) => {
          form.load({ ...SETTING_DEFAULTS[settingKey], ...data });
          toast.info("Older version loaded. Save to make it live.");
        }}
      />
    </div>
  );
}

/** Loads one settings key and renders its editor (Phase 8 todo 01-03, 05-06, 16-19). */
export function SettingsEditor({ settingKey, canEdit }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let live = true;
    adminJson(`/api/admin/settings/${settingKey}`).then((res) => live && setState(res));
    return () => {
      live = false;
    };
  }, [settingKey]);

  if (!state) return <Skeleton className="h-96" />;
  if (!state.ok) return <Alert tone="error">{state.data?.error ?? "Could not load these settings."}</Alert>;
  return (
    <Editor
      settingKey={settingKey}
      initial={state.data.value}
      media={state.data.media}
      updatedAt={state.data.updatedAt}
      canEdit={canEdit}
    />
  );
}
