"use client";

import { Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ThemeSwatch } from "@/components/admin/theme/ThemePreview";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { FONT_WHITELIST } from "@/lib/theme/presets";

const fontLabel = (kind, id) => FONT_WHITELIST[kind].find((f) => f.id === id)?.label ?? id;

/** Theme list (Phase 8 todo 07, 13): create, duplicate, rename via editor, delete, activate. */
export function ThemeList({ perms }) {
  const toast = useToast();
  const [themes, setThemes] = useState(null);
  const [reload, setReload] = useState(0);
  const [dup, setDup] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    adminJson("/api/admin/themes").then(
      (r) => live && (r.ok ? setThemes(r.data.themes) : setError(r.data?.error ?? "Could not load themes.")),
    );
    return () => {
      live = false;
    };
  }, [reload]);

  async function activate(t) {
    if (!window.confirm(`Make "${t.name}" the live theme? Every page of the website changes immediately.`))
      return;
    setBusy(true);
    const r = await adminJson(`/api/admin/themes/${t.id}/activate`, { method: "POST", json: {} });
    setBusy(false);
    if (!r.ok) return toast.error(r.data?.error ?? "Could not activate.");
    toast.success(`"${t.name}" is now live.`);
    setReload((k) => k + 1);
  }

  async function remove(t) {
    if (!window.confirm(`Delete the theme "${t.name}"?`)) return;
    const r = await adminJson(`/api/admin/themes/${t.id}`, { method: "DELETE" });
    if (!r.ok) return toast.error(r.data?.error ?? "Could not delete.");
    toast.success("Theme deleted.");
    setReload((k) => k + 1);
  }

  async function duplicate(e) {
    e.preventDefault();
    setBusy(true);
    const r = await adminJson("/api/admin/themes", {
      method: "POST",
      json: { name, ...(dup?.id ? { fromId: dup.id } : {}) },
    });
    setBusy(false);
    if (!r.ok) return toast.error(r.data?.fields?.name ?? r.data?.error ?? "Could not create the theme.");
    setDup(null);
    toast.success(`"${r.data.theme.name}" created.`);
    window.location.assign(`/admin/theme/${r.data.theme.id}`); // eslint-disable-line @next/next/no-location-assign-relative-destination
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!themes) return <Skeleton className="h-64" />;

  return (
    <div className="flex flex-col gap-5">
      {perms.create ? (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setDup({ id: themes.find((t) => t.isActive)?.id, name: "the live theme" });
              setName("My theme");
            }}
          >
            <Plus aria-hidden="true" /> New theme
          </Button>
        </div>
      ) : null}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Themes">
        {themes.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-4 surface-card p-5"
            data-active={t.isActive || undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-ink">{t.name}</span>
                <span className="text-[0.8125rem] text-muted">
                  {fontLabel("display", t.tokens.fonts.display)} + {fontLabel("body", t.tokens.fonts.body)} ·
                  default {t.mode.toLowerCase()}
                </span>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {t.isActive ? (
                  <Badge tone="success">
                    <Check aria-hidden="true" className="size-3" /> Live
                  </Badge>
                ) : null}
                {t.isPreset ? <Badge>Preset</Badge> : null}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <ThemeSwatch tokens={t.tokens} mode="light" />
              <ThemeSwatch tokens={t.tokens} mode="dark" />
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" href={`/admin/theme/${t.id}`}>
                <Pencil aria-hidden="true" /> {perms.update ? "Edit" : "View"}
              </Button>
              {perms.create ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDup({ id: t.id, name: t.name });
                    setName(`${t.name} copy`.slice(0, 40));
                  }}
                >
                  <Copy aria-hidden="true" /> Duplicate
                </Button>
              ) : null}
              {perms.publish && !t.isActive ? (
                <Button size="sm" onClick={() => activate(t)} disabled={busy}>
                  Make live
                </Button>
              ) : null}
              {perms.delete && !t.isActive && !t.isPreset ? (
                <Button size="sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => remove(t)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={Boolean(dup)}
        onClose={() => setDup(null)}
        title="New theme"
        description={dup ? `Starts as a copy of ${dup.name}.` : ""}
        size="sm"
      >
        <form onSubmit={duplicate} className="flex flex-col gap-4">
          <Field label="Theme name">
            <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDup(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={name.trim().length < 2}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
