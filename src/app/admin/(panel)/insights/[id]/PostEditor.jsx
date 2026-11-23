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
import { adminJson } from "@/lib/client/adminFetch";
import { slugify } from "@/lib/validation/catalogue";
import { POST_CATEGORIES, postSchema } from "@/lib/validation/content";

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  category: POST_CATEGORIES[0],
  coverId: null,
  status: "DRAFT",
  publishAt: "",
  seo: { title: "", description: "", noindex: false },
};

/** ISO -> "YYYY-MM-DDTHH:mm" in the browser's time zone (what <input type="datetime-local"> shows). */
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fields = (canPublish) => [
  { name: "title", label: "Title", required: true, maxLength: 140, wide: true },
  { name: "slug", label: "URL slug", required: true, maxLength: 80 },
  {
    name: "category",
    label: "Topic",
    type: "select",
    options: POST_CATEGORIES.map((c) => ({ value: c, label: c })),
  },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, disabled: !canPublish },
  {
    name: "publishAt",
    label: "Publish at (optional)",
    type: "datetime-local",
    hint: "Leave empty to publish now. A future time keeps the article hidden until then (it appears within the hour).",
  },
  {
    name: "excerpt",
    label: "Summary",
    type: "textarea",
    rows: 2,
    maxLength: 300,
    hint: "Shown in the article list and in search results.",
  },
  { name: "coverId", label: "Cover image", type: "media", folder: "insights" },
  {
    name: "body",
    label: "Article",
    type: "richtext",
    hint: "Use headings (H2/H3) for sections: they become the table of contents.",
  },
  {
    name: "seo",
    label: "Search engines",
    type: "group",
    hint: "Leave empty to use the title and summary.",
    fields: [
      { name: "title", label: "Page title", maxLength: 70 },
      { name: "description", label: "Description", maxLength: 170, wide: true },
      { name: "noindex", label: "Hide from search engines", type: "checkbox", wide: true },
    ],
  },
];

/** Article editor (Phase 15 todo 05): Tiptap body, cover, topic, schedule, SEO, history. */
export function PostEditor({ postId, perms }) {
  const [loaded, setLoaded] = useState(postId ? null : { post: EMPTY, live: false });
  const [error, setError] = useState("");
  useEffect(() => {
    if (!postId) return undefined;
    let live = true;
    adminJson(`/api/admin/posts/${postId}`).then((r) => {
      if (!live) return;
      if (!r.ok)
        return setError(
          r.status === 404 ? "This article does not exist." : (r.data?.error ?? "Could not load."),
        );
      setLoaded({
        post: { ...r.data.post, publishAt: toLocalInput(r.data.post.publishAt) },
        live: r.data.live,
      });
    });
    return () => {
      live = false;
    };
  }, [postId]);
  if (error) return <Alert tone="error">{error}</Alert>;
  if (!loaded) return <Skeleton className="h-96" />;
  return <Form postId={postId} initial={loaded.post} isLive={loaded.live} perms={perms} />;
}

function Form({ postId, initial, isLive, perms }) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !postId;
  const base = useZodForm(postSchema, initial);
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
      if (name === "title" && !slugTouched) base.set("slug", slugify(value));
      if (name === "slug") setSlugTouched(true);
    },
  };

  async function save() {
    const check = base.validate();
    if (!check.ok) return setError("Please fix the highlighted fields.");
    setSaving(true);
    setError("");
    // The browser's local time becomes an exact instant (ISO with zone) before it leaves the page.
    const payload = {
      ...check.data,
      publishAt: check.data.publishAt ? new Date(check.data.publishAt).toISOString() : "",
    };
    const r = await adminJson(isNew ? "/api/admin/posts" : `/api/admin/posts/${postId}`, {
      method: isNew ? "POST" : "PUT",
      json: payload,
    });
    setSaving(false);
    if (!r.ok) {
      base.setErrors(r.data?.fields ?? {});
      return setError(r.data?.error ?? "Could not save.");
    }
    toast.success(isNew ? "Article created." : "Article saved.");
    if (isNew) {
      base.markSaved(check.data);
      return setGoTo(`/admin/insights/${r.data.id}`);
    }
    base.markSaved({ ...r.data.post, publishAt: toLocalInput(r.data.post.publishAt) });
    setSavedAt(new Date());
  }

  async function remove() {
    const r = await adminJson(`/api/admin/posts/${postId}`, { method: "DELETE" });
    setConfirm(false);
    if (!r.ok) return toast.error(r.data?.error ?? "Could not delete.");
    toast.success("Article deleted.");
    setGoTo("/admin/insights");
  }

  return (
    <>
      <PageHeader
        title={isNew ? "New article" : initial.title}
        description={
          isNew ? "Write for buyers: plain words, real numbers, no hype." : `/insights/${initial.slug}`
        }
        actions={
          <>
            {isLive ? (
              <Button href={`/insights/${initial.slug}`} variant="secondary" size="sm" target="_blank">
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
      <fieldset disabled={!perms.update} className="surface-card p-5 md:p-6">
        <legend className="sr-only">Article</legend>
        <FormBuilder form={form} fields={fields(perms.publish)} />
      </fieldset>
      {perms.update ? (
        <SaveBar
          dirty={base.dirty && !goTo}
          saving={saving}
          savedAt={savedAt}
          onPublish={save}
          publishLabel={isNew ? "Create article" : "Save article"}
          onHistory={isNew ? undefined : () => setHistory(true)}
        />
      ) : null}
      {!isNew ? (
        <RevisionHistory
          open={history}
          onClose={() => setHistory(false)}
          entity="post"
          entityId={postId}
          onRestore={(data) => {
            base.load({
              ...EMPTY,
              ...data,
              slug: base.values.slug,
              status: base.values.status,
              publishAt: base.values.publishAt,
            });
            toast.info("Older version loaded. Save to make it live.");
          }}
        />
      ) : null}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this article?"
        description="It is removed from the website."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={remove}>Delete article</Button>
          </>
        }
      />
    </>
  );
}
