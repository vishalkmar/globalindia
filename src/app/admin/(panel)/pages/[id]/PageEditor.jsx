"use client";

import { Copy, ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { SaveBar } from "@/components/admin/SaveBar";
import { SortableList } from "@/components/admin/SortableList";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { normaliseSection, SECTIONS } from "@/lib/sections/registry";
import { cn } from "@/lib/utils";

import { SectionDrawer } from "./SectionDrawer";

let seq = 0;
const key = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;
const withKeys = (content) => ({ ...content, sections: content.sections.map((s) => ({ ...s, key: key() })) });
const strip = (content) => ({ ...content, sections: content.sections.map(({ key: _k, ...s }) => s) });  
const publicPath = (slug) => (slug === "home" ? "/" : `/${slug}`);

function summary(s) {
  const d = s.data ?? {};
  return d.title || d.eyebrow || d.items?.[0]?.title || d.steps?.[0]?.title || SECTIONS[s.type].description;
}

/** Page editor (Phase 10 todo 16-17): sections, page SEO, draft / publish / preview / history. */
export function PageEditor({ pageId, perms }) {
  const toast = useToast();
  const [page, setPage] = useState(null);
  const [content, setContent] = useState(null);
  const [baseline, setBaseline] = useState("");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(false);

  function load(p) {
    setPage(p);
    const c = withKeys(p.content);
    setContent(c);
    setBaseline(JSON.stringify(strip(c)));
  }

  useEffect(() => {
    let live = true;
    adminJson(`/api/admin/pages/${pageId}`).then((r) => {
      if (!live) return;
      if (!r.ok) return setError(r.data?.error ?? "Could not load the page.");
      load(r.data.page);
    });
    return () => {
      live = false;
    };
  }, [pageId]);

  const dirty = useMemo(() => content && JSON.stringify(strip(content)) !== baseline, [content, baseline]);

  if (error && !content) return <Alert tone="error">{error}</Alert>;
  if (!content) return <Skeleton className="h-96" />;

  const canEdit = perms.update;
  const setSections = (fn) => setContent((c) => ({ ...c, sections: fn(c.sections) }));

  async function saveDraft({ quiet = false } = {}) {
    setSaving(true);
    setError("");
    const r = await adminJson(`/api/admin/pages/${pageId}`, { method: "PUT", json: strip(content) });
    setSaving(false);
    if (!r.ok) {
      const first = r.data?.fields ? Object.entries(r.data.fields)[0] : null;
      setError(first ? `${r.data.error} (${first[0]}: ${first[1]})` : (r.data?.error ?? "Could not save the draft."));
      return false;
    }
    load(r.data.page);
    setSavedAt(new Date());
    if (!quiet) toast.success("Draft saved. Visitors still see the published page.");
    return true;
  }

  async function publish() {
    if (!window.confirm("Publish these changes? Visitors will see them straight away.")) return;
    if (dirty && !(await saveDraft({ quiet: true }))) return;
    setSaving(true);
    const r = await adminJson(`/api/admin/pages/${pageId}/publish`, { method: "POST", json: {} });
    setSaving(false);
    if (!r.ok) return setError(r.data?.error ?? "Could not publish.");
    load(r.data.page);
    setSavedAt(new Date());
    toast.success("Published. The page is live.");
  }

  async function preview() {
    if (dirty && !(await saveDraft({ quiet: true }))) return;
    const r = await adminJson("/api/admin/preview", { method: "POST", json: { path: publicPath(page.slug) } });
    if (!r.ok) return toast.error(r.data?.error ?? "Could not open the preview.");
    window.open(r.data.url, "_blank", "noopener");
  }

  async function discard() {
    if (!window.confirm("Throw away all unpublished changes to this page?")) return;
    const r = await adminJson(`/api/admin/pages/${pageId}/discard`, { method: "POST", json: {} });
    if (!r.ok) return toast.error(r.data?.error ?? "Could not discard.");
    load(r.data.page);
    toast.info("Unpublished changes discarded.");
  }

  const pending = page.hasDraft || dirty;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={page.status === "PUBLISHED" ? "success" : "neutral"}>{page.status === "PUBLISHED" ? "Published" : "Not published"}</Badge>
        {pending ? <Badge tone="accent">Unpublished changes</Badge> : null}
        <a href={publicPath(page.slug)} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          View live page <ExternalLink aria-hidden="true" className="size-4" />
        </a>
        {page.hasDraft && canEdit ? (
          <Button size="sm" variant="ghost" onClick={discard}>
            <Undo2 aria-hidden="true" /> Discard draft
          </Button>
        ) : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {!canEdit ? <Alert tone="info">Your role can view this page but not change it.</Alert> : null}

      <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h4 text-primary">Sections</h2>
          {canEdit ? (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" /> Add section
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted">Drag to change the order. Hidden sections stay saved but are not shown on the website. Backgrounds alternate automatically.</p>
        <SortableList
          disabled={!canEdit}
          items={content.sections.map((s) => ({ ...s, id: s.key, label: SECTIONS[s.type].label }))}
          onReorder={(next) => setSections((list) => next.map((n) => list.find((s) => s.key === n.id)))}
          renderItem={(item) => {
            const s = content.sections.find((x) => x.key === item.id);
            return (
              <div className={cn("flex flex-wrap items-center gap-3", !s.isVisible && "opacity-60")}>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    {SECTIONS[s.type].label}
                    {!s.isVisible ? <Badge>Hidden</Badge> : null}
                  </p>
                  <p className="truncate text-[0.8125rem] text-muted">{summary(s)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" aria-label={`Edit ${SECTIONS[s.type].label}`} onClick={() => setEditing(s)}>
                    <Pencil aria-hidden="true" />
                  </Button>
                  {canEdit ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={s.isVisible ? `Hide ${SECTIONS[s.type].label}` : `Show ${SECTIONS[s.type].label}`}
                        aria-pressed={!s.isVisible}
                        onClick={() => setSections((list) => list.map((x) => (x.key === s.key ? { ...x, isVisible: !x.isVisible } : x)))}
                      >
                        {s.isVisible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Duplicate ${SECTIONS[s.type].label}`}
                        onClick={() =>
                          setSections((list) => {
                            const i = list.findIndex((x) => x.key === s.key);
                            const copy = { type: s.type, isVisible: s.isVisible, data: structuredClone(s.data), key: key() };
                            return [...list.slice(0, i + 1), copy, ...list.slice(i + 1)];
                          })
                        }
                      >
                        <Copy aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${SECTIONS[s.type].label}`}
                        onClick={() => window.confirm(`Remove the ${SECTIONS[s.type].label} section?`) && setSections((list) => list.filter((x) => x.key !== s.key))}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          }}
        />
        {content.sections.length === 0 ? <p className="text-sm text-muted">No sections yet. Add the first one.</p> : null}
      </section>

      <section className="grid gap-4 rounded-card border border-line bg-card p-5 md:grid-cols-2">
        <h2 className="text-h4 text-primary md:col-span-2">Page details and search engines</h2>
        <fieldset disabled={!canEdit} className="contents">
          <Field label="Page name (admin)">
            <Input value={content.title} maxLength={80} onChange={(e) => setContent((c) => ({ ...c, title: e.target.value }))} />
          </Field>
          <Field label="Title in Google" hint={`${content.seo.title.length}/70 · Leave empty to use the site default.`}>
            <Input value={content.seo.title} maxLength={70} onChange={(e) => setContent((c) => ({ ...c, seo: { ...c.seo, title: e.target.value } }))} />
          </Field>
          <Field label="Description in Google" hint={`${content.seo.description.length}/170`} className="md:col-span-2">
            <Textarea rows={2} value={content.seo.description} maxLength={170} onChange={(e) => setContent((c) => ({ ...c, seo: { ...c.seo, description: e.target.value } }))} />
          </Field>
          <Checkbox
            label="Hide this page from search engines"
            checked={content.seo.noindex}
            onChange={(e) => setContent((c) => ({ ...c, seo: { ...c.seo, noindex: e.target.checked } }))}
          />
        </fieldset>
      </section>

      {canEdit ? (
        <SaveBar
          dirty={Boolean(dirty)}
          saving={saving}
          status={page.status}
          savedAt={savedAt}
          onSaveDraft={() => saveDraft()}
          onPublish={perms.publish ? publish : undefined}
          canPublish={pending}
          onPreview={preview}
          onHistory={() => setHistory(true)}
        />
      ) : null}

      <SectionDrawer
        section={editing}
        readOnly={!canEdit}
        onClose={() => setEditing(null)}
        onApply={(data) => {
          setSections((list) => list.map((x) => (x.key === editing.key ? { ...x, data } : x)));
          setEditing(null);
          toast.info("Section updated in the draft. Save draft or Publish to keep it.");
        }}
      />

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a section" description="It is added at the end; drag it into place." size="lg">
        <ul className="grid gap-3 sm:grid-cols-2">
          {Object.entries(SECTIONS).map(([type, def]) => (
            <li key={type}>
              <button
                type="button"
                onClick={() => {
                  setSections((list) => [...list, { type, isVisible: true, data: normaliseSection(type, null), key: key() }]);
                  setAdding(false);
                }}
                className="flex h-full w-full flex-col items-start gap-1 rounded-card border border-line bg-card p-4 text-left transition-colors hover:border-primary"
              >
                <span className="font-semibold text-ink">{def.label}</span>
                <span className="text-sm text-muted">{def.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>

      <RevisionHistory
        open={history}
        onClose={() => setHistory(false)}
        entity="page"
        entityId={pageId}
        onRestore={(data) => {
          setContent(withKeys(data));
          toast.info("Older version loaded. Save draft or Publish to keep it.");
        }}
      />
    </div>
  );
}
