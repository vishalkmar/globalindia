"use client";

import { Copy, Crosshair, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Field, Input, Select } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { adminJson } from "@/lib/client/adminFetch";
import { IMAGE_MIME, MEDIA_FOLDERS, PDF_MIME } from "@/lib/media/constants";
import { formatBytes } from "@/lib/utils";

const when = (d) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));

/** Click on the image to set the focal point used for crops (Phase 7 todo 13). */
function FocalPicker({ asset, value, onChange }) {
  const ref = useRef(null);
  function pick(e) {
    const r = ref.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    onChange({ x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 });
  }
  function key(e) {
    const step = 0.05;
    const cur = value ?? { x: 0.5, y: 0.5 };
    const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (!map[e.key]) return;
    e.preventDefault();
    onChange({ x: Math.min(1, Math.max(0, cur.x + map[e.key][0])), y: Math.min(1, Math.max(0, cur.y + map[e.key][1])) });
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Focal point. Click the most important part of the image, or use arrow keys."
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((value?.x ?? 0.5) * 100)}
        aria-valuetext={value ? `${Math.round(value.x * 100)}% across, ${Math.round(value.y * 100)}% down` : "Centre"}
        onClick={pick}
        onKeyDown={key}
        className="relative min-h-32 cursor-crosshair overflow-hidden rounded-btn border border-line bg-surface"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of any driver */}
        <img src={asset.url} alt={asset.alt || ""} className="block max-h-72 w-full object-contain" />
        {value ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.6)]"
            style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }}
          />
        ) : null}
      </div>
      <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted">
        <Crosshair aria-hidden="true" className="size-3.5" /> Click the part that must stay visible when the image is cropped.
      </p>
    </div>
  );
}

/**
 * Asset drawer: alt text (required for images), folder, focal point, replace (same id everywhere),
 * where it is used, delete (blocked while used).
 */
export function MediaDetail({ assetId, open, onClose, onChanged, onDeleted }) {
  const toast = useToast();
  const { uploadFile } = useMediaUpload();
  const [data, setData] = useState(null);
  const [alt, setAlt] = useState("");
  const [folder, setFolder] = useState("library");
  const [focal, setFocal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replaceProgress, setReplaceProgress] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open || !assetId) return undefined;
    let live = true;
    adminJson(`/api/admin/media/${assetId}`).then((res) => {
      if (!live) return;
      if (!res.ok) return setError(res.data?.error ?? "Could not load this file.");
      setData(res.data);
      setAlt(res.data.asset.alt);
      setFolder(res.data.asset.folder);
      setFocal(res.data.asset.focalX != null ? { x: res.data.asset.focalX, y: res.data.asset.focalY } : null);
      setError("");
    });
    return () => {
      live = false;
    };
  }, [open, assetId]);

  const asset = data?.asset;
  const dirty = asset && (alt !== asset.alt || folder !== asset.folder || (focal?.x ?? null) !== asset.focalX || (focal?.y ?? null) !== asset.focalY);

  async function save() {
    setBusy(true);
    setError("");
    const body = { alt, folder };
    if (asset.type === "IMAGE") Object.assign(body, { focalX: focal?.x ?? null, focalY: focal?.y ?? null });
    const res = await adminJson(`/api/admin/media/${asset.id}`, { method: "PATCH", json: body });
    setBusy(false);
    if (!res.ok) return setError(res.data?.error ?? "Could not save.");
    setData((d) => ({ ...d, asset: res.data.asset }));
    onChanged?.(res.data.asset);
    toast.success("File details saved.");
  }

  async function replace(file) {
    setError("");
    setReplaceProgress(0);
    try {
      const updated = await uploadFile(file, { replaceId: asset.id, folder: asset.folder, onProgress: setReplaceProgress });
      setData((d) => ({ ...d, asset: updated }));
      setFocal(null);
      onChanged?.(updated);
      toast.success("File replaced. Every page using it now shows the new version.");
    } catch (err) {
      setError(err.message);
    } finally {
      setReplaceProgress(null);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this file from the library?")) return;
    setBusy(true);
    const res = await adminJson(`/api/admin/media/${asset.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      if (res.data?.usage) setData((d) => ({ ...d, usage: res.data.usage }));
      return setError(res.data?.error ?? "Could not delete.");
    }
    toast.success("File deleted.");
    onDeleted?.(asset.id);
  }

  return (
    <Drawer open={open} onClose={onClose} title="File details" className="w-[min(560px,calc(100%-24px))]">
      {!asset && !error ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56" />
          <Skeleton lines={4} />
        </div>
      ) : null}
      {error && !asset ? <Alert tone="error">{error}</Alert> : null}
      {asset ? (
        <div className="flex flex-col gap-5">
          {asset.type === "IMAGE" ? (
            <FocalPicker asset={asset} value={focal} onChange={setFocal} />
          ) : (
            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-primary underline">
              Open PDF <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          )}

          {error ? <Alert tone="error">{error}</Alert> : null}
          {asset.type === "IMAGE" && !alt.trim() ? (
            <Alert tone="info" title="Alt text needed">
              Describe what the photo shows, e.g. &ldquo;200 L drums of propylene glycol in the Burari Road warehouse&rdquo;. The image cannot be used on the site without it.
            </Alert>
          ) : null}

          {asset.type === "IMAGE" ? (
            <Field label="Alt text" hint="What a person who cannot see the image needs to know. Keep it under 200 characters.">
              <Input value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
            </Field>
          ) : (
            <Field label="Description (optional)">
              <Input value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
            </Field>
          )}
          <Field label="Folder">
            <Select value={folder} onChange={(e) => setFolder(e.target.value)}>
              {MEDIA_FOLDERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} loading={busy} disabled={!dirty}>
              Save details
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={replaceProgress !== null}>
              <RefreshCw aria-hidden="true" /> {replaceProgress !== null ? `Replacing ${replaceProgress}%` : "Replace file"}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(new URL(asset.url, window.location.origin).toString());
                toast.info("Link copied.");
              }}
            >
              <Copy aria-hidden="true" /> Copy link
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              tabIndex={-1}
              accept={(asset.type === "PDF" ? PDF_MIME : IMAGE_MIME).join(",")}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) replace(f);
              }}
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-card border border-line bg-surface p-4 text-sm">
            <dt className="text-muted">File</dt>
            <dd className="truncate">{asset.originalName || "—"}</dd>
            <dt className="text-muted">Type</dt>
            <dd className="font-data uppercase">{asset.format}</dd>
            <dt className="text-muted">Size</dt>
            <dd className="font-data">{formatBytes(asset.bytes)}</dd>
            {asset.width ? (
              <>
                <dt className="text-muted">Dimensions</dt>
                <dd className="font-data">
                  {asset.width} x {asset.height} px
                </dd>
              </>
            ) : null}
            <dt className="text-muted">Uploaded</dt>
            <dd>
              {when(asset.createdAt)}
              {asset.uploadedBy ? ` by ${asset.uploadedBy}` : ""}
            </dd>
            <dt className="text-muted">Version</dt>
            <dd className="font-data">{asset.version}</dd>
          </dl>

          <div className="flex flex-col gap-2">
            <h3 className="text-h4 text-primary">Used in</h3>
            {data.usage.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {data.usage.map((u) => (
                  <li key={u.label}>{u.href ? <Link href={u.href} className="text-primary underline underline-offset-4">{u.label}</Link> : u.label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Not used anywhere yet.</p>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <Button variant="ghost" onClick={remove} disabled={busy || data.usage.length > 0} title={data.usage.length ? "Remove it from the places above first" : undefined} className="text-error">
              <Trash2 aria-hidden="true" /> Delete file
            </Button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
