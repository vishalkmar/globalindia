"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Field, Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { redirectSchema } from "@/lib/validation/redirects";

const BLANK = { fromPath: "", toPath: "", statusCode: 301 };

function RedirectDialog({ value, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(value?.data ?? BLANK);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isNew = !value?.id;

  async function save() {
    const check = redirectSchema.safeParse({ ...form, statusCode: Number(form.statusCode) });
    if (!check.success) {
      setErrors(Object.fromEntries(check.error.issues.map((i) => [i.path.join("."), i.message])));
      return;
    }
    setBusy(true);
    const r = await adminJson(isNew ? "/api/admin/redirects" : `/api/admin/redirects/${value.id}`, {
      method: isNew ? "POST" : "PUT",
      json: check.data,
    });
    setBusy(false);
    if (!r.ok) {
      setErrors(r.data?.fields ?? {});
      return setError(r.data?.error ?? "Could not save.");
    }
    toast.success("Redirect saved. It works across the site within a minute.");
    onSaved();
  }

  async function remove() {
    setBusy(true);
    const r = await adminJson(`/api/admin/redirects/${value.id}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) return setError(r.data?.error ?? "Could not delete.");
    toast.success("Redirect deleted.");
    onSaved();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? "New redirect" : "Edit redirect"}
      description="Send visitors and search engines from an old address to a new one."
      footer={
        <>
          {!isNew ? (
            <Button variant="ghost" className="mr-auto text-error" onClick={remove} disabled={busy}>
              <Trash2 aria-hidden="true" /> Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save redirect
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field
          label="From (old address)"
          required
          error={errors.fromPath}
          hint="A path on this site, e.g. /products/old-name"
        >
          <Input
            value={form.fromPath}
            onChange={(e) => setForm((f) => ({ ...f, fromPath: e.target.value }))}
            className="font-data"
          />
        </Field>
        <Field
          label="To (new address)"
          required
          error={errors.toPath}
          hint="A path on this site, or a full https:// link"
        >
          <Input
            value={form.toPath}
            onChange={(e) => setForm((f) => ({ ...f, toPath: e.target.value }))}
            className="font-data"
          />
        </Field>
        <Field label="Type">
          <Select
            value={String(form.statusCode)}
            onChange={(e) => setForm((f) => ({ ...f, statusCode: Number(e.target.value) }))}
          >
            <option value="301">Permanent (301): the page has moved for good</option>
            <option value="302">Temporary (302): it will come back</option>
          </Select>
        </Field>
      </div>
    </Dialog>
  );
}

/** Redirect manager (Phase 16 todo 03). Slug changes add redirects automatically; this is for the rest. */
export function RedirectsManager({ canEdit }) {
  const [editing, setEditing] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <>
      <PageHeader
        title="Redirects"
        description="Old addresses and where they now go. Changing a product, category, industry or article URL adds one here automatically."
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setEditing({ id: null, data: BLANK })}>
              <Plus aria-hidden="true" /> New redirect
            </Button>
          ) : null
        }
      />
      <DataTable
        endpoint="/api/admin/redirects"
        caption="Redirects"
        reloadKey={reloadKey}
        searchPlaceholder="Search addresses"
        defaultSort={{ sort: "updatedAt", dir: "desc" }}
        columns={[
          {
            key: "fromPath",
            label: "From",
            sortable: true,
            render: (r) =>
              canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      id: r.id,
                      data: { fromPath: r.fromPath, toPath: r.toPath, statusCode: r.statusCode },
                    })
                  }
                  className="font-data text-[0.8125rem] font-semibold text-primary hover:underline"
                >
                  {r.fromPath}
                </button>
              ) : (
                <span className="font-data text-[0.8125rem]">{r.fromPath}</span>
              ),
          },
          {
            key: "toPath",
            label: "To",
            sortable: true,
            render: (r) => <span className="font-data text-[0.8125rem] break-all">{r.toPath}</span>,
          },
          {
            key: "statusCode",
            label: "Type",
            render: (r) => <Badge tone={r.statusCode === 301 ? "primary" : "neutral"}>{r.statusCode}</Badge>,
          },
          {
            key: "hits",
            label: "Used",
            sortable: true,
            render: (r) => <span className="font-data text-[0.8125rem]">{r.hits}</span>,
          },
        ]}
        empty={{ title: "No redirects", text: "Redirects appear here when an address changes." }}
      />
      {editing ? (
        <RedirectDialog
          key={editing.id ?? "new"}
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}
    </>
  );
}
