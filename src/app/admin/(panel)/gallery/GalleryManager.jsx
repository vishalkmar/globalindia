"use client";

import { Eye, EyeOff, Images, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/admin/EmptyState";
import { AssetThumb } from "@/components/admin/media/MediaBrowser";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { SaveBar } from "@/components/admin/SaveBar";
import { SortableList } from "@/components/admin/SortableList";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { GALLERY_CATEGORIES, GALLERY_MAX_ITEMS, gallerySchema } from "@/lib/validation/gallery";

const payload = (items) =>
  items.map(({ mediaId, caption, category, isVisible }) => ({ mediaId, caption, category, isVisible }));
const MISSING_MEDIA = { type: "IMAGE", url: "", alt: "Deleted photo" };

/** Gallery manager (Phase 11 todo 14): add from the media library, caption, categorise, reorder, hide, remove. */
export function GalleryManager({ canEdit }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [baseline, setBaseline] = useState("[]");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [history, setHistory] = useState(false);

  function load(list) {
    setItems(list);
    setBaseline(JSON.stringify(payload(list)));
  }

  useEffect(() => {
    let live = true;
    adminJson("/api/admin/gallery").then((res) => {
      if (!live) return;
      if (!res.ok) return setError(res.data?.error ?? "Could not load the gallery.");
      load(res.data.items);
    });
    return () => {
      live = false;
    };
  }, []);

  const dirty = useMemo(
    () => items !== null && JSON.stringify(payload(items)) !== baseline,
    [items, baseline],
  );
  const categories = useMemo(
    () => [
      ...new Set([...GALLERY_CATEGORIES, ...(items ?? []).map((i) => i.category.trim()).filter(Boolean)]),
    ],
    [items],
  );

  async function save() {
    const check = gallerySchema.safeParse({ items: payload(items) });
    if (!check.success) {
      setErrors(Object.fromEntries(check.error.issues.map((i) => [i.path.join("."), i.message])));
      return setError("Please fix the highlighted photos.");
    }
    setSaving(true);
    setError("");
    setErrors({});
    const res = await adminJson("/api/admin/gallery", { method: "PUT", json: check.data });
    setSaving(false);
    if (!res.ok) {
      setErrors(res.data?.fields ?? {});
      return setError(res.data?.error ?? "Could not save.");
    }
    load(res.data.items);
    setSavedAt(new Date());
    toast.success("Gallery saved. The public page is updated.");
  }

  function add(asset) {
    if (!asset) return;
    if (items.some((i) => i.mediaId === asset.id)) return toast.info("That photo is already in the gallery.");
    setItems((list) => [
      ...list,
      {
        mediaId: asset.id,
        caption: "",
        category: list.at(-1)?.category ?? GALLERY_CATEGORIES[0],
        isVisible: true,
        media: asset,
        missing: false,
      },
    ]);
  }

  /** A revision stores only ids and text; look the images up again (deleted ones are flagged). */
  async function restore(data) {
    const known = new Map(items.map((i) => [i.mediaId, i]));
    const restored = await Promise.all(
      (data.items ?? []).map(async (it) => {
        if (known.has(it.mediaId))
          return { ...it, media: known.get(it.mediaId).media, missing: known.get(it.mediaId).missing };
        const res = await adminJson(`/api/admin/media/${it.mediaId}`);
        return res.ok
          ? { ...it, media: res.data.asset, missing: false }
          : { ...it, media: MISSING_MEDIA, missing: true };
      }),
    );
    setItems(restored);
    setErrors({});
    toast.info("Older version loaded. Save to make it live.");
  }

  const update = (mediaId, patch) =>
    setItems((list) => list.map((i) => (i.mediaId === mediaId ? { ...i, ...patch } : i)));

  if (error && items === null) return <Alert tone="error">{error}</Alert>;
  if (items === null) return <Skeleton className="h-64" />;

  return (
    <div className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <datalist id="gallery-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <section className="flex flex-col gap-4 surface-card p-5">
        {items.length ? (
          <fieldset disabled={!canEdit} className="flex flex-col gap-3">
            <legend className="sr-only">Gallery photos</legend>
            <SortableList
              items={items.map((i) => ({ ...i, id: i.mediaId, label: i.caption || i.media.alt || "Photo" }))}
              disabled={!canEdit}
              onReorder={(next) => setItems(next.map((n) => items.find((i) => i.mediaId === n.id)))}
              renderItem={(row) => {
                const idx = items.findIndex((i) => i.mediaId === row.id);
                const item = items[idx];
                const name = item.caption || item.media.alt || "photo";
                const problem =
                  errors[`items.${idx}.mediaId`] ??
                  (item.missing
                    ? "This photo was deleted from the media library. Remove it before saving."
                    : null) ??
                  errors[`items.${idx}.caption`] ??
                  errors[`items.${idx}.category`];
                return (
                  <div className="flex flex-col gap-2" data-testid="gallery-row">
                    <div className="grid items-start gap-3 sm:grid-cols-[96px_1fr_auto]">
                      <AssetThumb
                        asset={item.media}
                        className={
                          item.isVisible
                            ? "aspect-[4/3] w-24 rounded"
                            : "aspect-[4/3] w-24 rounded opacity-50"
                        }
                      />
                      <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr]">
                        <Input
                          size="sm"
                          aria-label={`Caption for ${item.media.alt || "photo"}`}
                          placeholder="Caption (optional)"
                          maxLength={140}
                          value={item.caption}
                          onChange={(e) => update(item.mediaId, { caption: e.target.value })}
                          aria-invalid={errors[`items.${idx}.caption`] ? true : undefined}
                        />
                        <Input
                          size="sm"
                          aria-label={`Category for ${item.media.alt || "photo"}`}
                          placeholder="Category"
                          list="gallery-categories"
                          maxLength={40}
                          value={item.category}
                          onChange={(e) => update(item.mediaId, { category: e.target.value })}
                          aria-invalid={errors[`items.${idx}.category`] ? true : undefined}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={item.isVisible ? `Hide ${name}` : `Show ${name}`}
                          aria-pressed={!item.isVisible}
                          title={item.isVisible ? "Visible" : "Hidden"}
                          onClick={() => update(item.mediaId, { isVisible: !item.isVisible })}
                        >
                          {item.isVisible ? (
                            <Eye aria-hidden="true" />
                          ) : (
                            <EyeOff aria-hidden="true" className="text-muted" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Remove ${name}`}
                          onClick={() => setItems((l) => l.filter((i) => i.mediaId !== item.mediaId))}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    {problem ? <p className="text-[0.8125rem] text-error">{problem}</p> : null}
                  </div>
                );
              }}
            />
          </fieldset>
        ) : (
          <EmptyState
            icon={Images}
            title="No photos yet"
            text="Add photos of the warehouse, stock, packing and dispatch. They appear on the public Gallery page in this order."
          />
        )}

        {canEdit && items.length < GALLERY_MAX_ITEMS ? (
          <div className="max-w-md">
            {/* key resets the picker after each pick so it is ready for the next photo */}
            <MediaPicker
              key={items.length}
              label="Add a photo"
              folder="gallery"
              value={null}
              onChange={add}
              hint="Upload a new photo or pick one from the media library."
            />
          </div>
        ) : null}
      </section>

      <p className="text-sm text-muted">
        Photos come from the{" "}
        <Link href="/admin/media" className="font-semibold text-primary underline underline-offset-2">
          media library
        </Link>
        . Removing a photo here does not delete the file.
      </p>

      {canEdit ? (
        <SaveBar
          dirty={dirty}
          saving={saving}
          savedAt={savedAt}
          onPublish={save}
          publishLabel="Save gallery"
          onHistory={() => setHistory(true)}
        />
      ) : null}
      <RevisionHistory
        open={history}
        onClose={() => setHistory(false)}
        entity="gallery"
        entityId="gallery"
        onRestore={restore}
      />
    </div>
  );
}
