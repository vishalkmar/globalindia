"use client";

import { Download, Plus, Star, Upload } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/admin/catalogue/StatusBadge";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Alert } from "@/components/ui/Static";
import { FAMILIES } from "@/lib/catalogue/families";
import { adminJson } from "@/lib/client/adminFetch";

const when = (d) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(d));
const MAX_CSV = 2 * 1024 * 1024;

/** CSV import (Phase 12 todo 14): check first (dry run), then apply only if every row is valid. */
function ImportDialog({ open, onClose, onDone }) {
  const toast = useToast();
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setCsv("");
    setFileName("");
    setResult(null);
    setError("");
  }

  async function pick(files) {
    const file = files[0];
    if (!file) return;
    reset();
    if (file.size > MAX_CSV) return setError("The file is larger than 2 MB.");
    if (!/\.csv$/i.test(file.name)) return setError("Choose a .csv file.");
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    await run(text, false);
  }

  async function run(text, apply) {
    setBusy(true);
    setError("");
    const res = await adminJson("/api/admin/products/import", { method: "POST", json: { csv: text, apply } });
    setBusy(false);
    if (!res.ok) return setError(res.data?.error ?? "The file could not be checked.");
    setResult(res.data);
    if (res.data.applied) {
      toast.success(`Import done: ${res.data.summary.create} created, ${res.data.summary.update} updated.`);
      onDone();
      onClose();
      reset();
    }
  }

  const errors = result?.rows.filter((r) => r.action === "error") ?? [];
  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Import products from CSV"
      description="Rows are matched by slug: existing products are updated, new slugs are created. Specs, FAQs, images and documents are not touched."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => run(csv, true)}
            disabled={!result || errors.length > 0 || busy}
            loading={busy && Boolean(result)}
          >
            Import {result ? `${result.summary.create + result.summary.update} rows` : ""}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Start from{" "}
          <a
            href="/api/admin/products/export"
            download
            className="font-semibold text-primary underline underline-offset-2"
          >
            an export
          </a>{" "}
          so the columns are right. Lists (pack sizes, applications) use “|” between items.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            data-testid="csv-input"
            onChange={(e) => pick(Array.from(e.target.files ?? []))}
            className="rounded-btn border border-line bg-card p-2 text-sm file:mr-3 file:rounded-btn file:border-0 file:bg-surface file:px-3 file:py-1.5 file:font-semibold"
          />
          <span className="text-[0.8125rem] text-muted">
            {fileName ? `Selected: ${fileName}` : "Up to 1,000 rows, 2 MB."}
          </span>
        </label>
        {busy && !result ? <p className="text-sm text-muted">Checking the file…</p> : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
        {result ? (
          <div className="flex flex-col gap-3" data-testid="import-report">
            <p className="text-sm">
              <strong>{result.summary.create}</strong> new, <strong>{result.summary.update}</strong> to
              update, <strong className={errors.length ? "text-error" : ""}>{result.summary.error}</strong>{" "}
              with problems.
            </p>
            {errors.length ? (
              <Alert
                tone="error"
                title="Fix these rows and choose the file again. Nothing has been imported."
              >
                <ul className="mt-1 flex max-h-56 flex-col gap-1 overflow-auto text-[0.8125rem]">
                  {errors.map((r) => (
                    <li key={r.line}>
                      Line {r.line} ({r.slug || "no slug"}): {r.errors.join(" ")}
                    </li>
                  ))}
                </ul>
              </Alert>
            ) : (
              <Alert tone="success">Every row is valid. Press Import to apply.</Alert>
            )}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

/** Products list (Phase 12 todo 04): search by name, slug or CAS; filter by family, category, status, featured. */
export function ProductsManager({ categories, perms }) {
  const [importing, setImporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const columns = [
    {
      key: "name",
      label: "Product",
      sortable: true,
      render: (p) => (
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            {p.name}
            {p.featured ? <Star aria-label="Featured" className="size-3.5 fill-accent text-accent" /> : null}
          </span>
          <span className="font-data text-[0.75rem] text-muted">{p.slug}</span>
        </span>
      ),
    },
    { key: "category", label: "Category", render: (p) => p.category.name },
    {
      key: "casNo",
      label: "CAS",
      sortable: true,
      render: (p) => <span className="font-data text-[0.8125rem]">{p.casNo || "—"}</span>,
    },
    { key: "status", label: "Status", sortable: true, render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "updatedAt",
      label: "Updated",
      sortable: true,
      render: (p) => <span className="text-muted">{when(p.updatedAt)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything in the catalogue. Drafts and archived products are not shown on the website."
        actions={
          <>
            {/* plain <a>: a Next <Link> could prefetch the export route */}
            <a
              href="/api/admin/products/export"
              download
              className="inline-flex h-9 items-center gap-2 rounded-btn border border-primary px-3.5 text-sm font-semibold text-primary hover:bg-[color-mix(in_oklab,var(--c-primary)_7%,transparent)] [&_svg]:size-4"
            >
              <Download aria-hidden="true" /> Export CSV
            </a>
            {perms.import ? (
              <Button variant="secondary" size="sm" onClick={() => setImporting(true)}>
                <Upload aria-hidden="true" /> Import CSV
              </Button>
            ) : null}
            {perms.create ? (
              <Button href="/admin/products/new" size="sm">
                <Plus aria-hidden="true" /> New product
              </Button>
            ) : null}
          </>
        }
      />
      <DataTable
        endpoint="/api/admin/products"
        caption="Products"
        columns={columns}
        searchPlaceholder="Search name, slug or CAS number"
        defaultSort={{ sort: "updatedAt", dir: "desc" }}
        reloadKey={reloadKey}
        rowHref={(p) => `/admin/products/${p.id}`}
        filters={[
          {
            key: "family",
            label: "Families",
            options: FAMILIES.map((f) => ({ value: f.key, label: f.name })),
          },
          {
            key: "category",
            label: "Categories",
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            key: "status",
            label: "Statuses",
            options: [
              { value: "PUBLISHED", label: "Published" },
              { value: "DRAFT", label: "Draft" },
              { value: "ARCHIVED", label: "Archived" },
            ],
          },
          {
            key: "featured",
            label: "Featured or not",
            options: [
              { value: "yes", label: "Featured" },
              { value: "no", label: "Not featured" },
            ],
          },
        ]}
        empty={{ title: "No products match", text: "Try a different search or clear the filters." }}
      />
      <ImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        onDone={() => setReloadKey((n) => n + 1)}
      />
    </>
  );
}
