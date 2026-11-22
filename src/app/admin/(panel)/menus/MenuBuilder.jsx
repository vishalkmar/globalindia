"use client";

import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { SaveBar } from "@/components/admin/SaveBar";
import { SortableList } from "@/components/admin/SortableList";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { Checkbox, Input, Select } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { MENU_LOCATIONS, menuSchemaFor } from "@/lib/settings/menus";
import { cn } from "@/lib/utils";

let seq = 0;
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;
const withIds = (items) =>
  items.map((i) => ({ ...i, id: uid(), children: (i.children ?? []).map((c) => ({ ...c, id: uid() })) }));
const strip = (items) =>
  items.map(({ id, children, ...rest }) => ({
    ...rest,
    children: (children ?? []).map(({ id: _cid, ...c }) => c),
  }));

function LinkRow({ item, onChange, onRemove, errors, path, compact }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "grid gap-2",
          compact ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_1.3fr_auto]",
        )}
      >
        <Input
          size="sm"
          aria-label="Label"
          placeholder="Label"
          value={item.label}
          onChange={(e) => onChange({ ...item, label: e.target.value })}
          aria-invalid={errors[`${path}.label`] ? true : undefined}
        />
        <Input
          size="sm"
          aria-label="Link"
          placeholder="/page or https://"
          value={item.href}
          onChange={(e) => onChange({ ...item, href: e.target.value })}
          aria-invalid={errors[`${path}.href`] ? true : undefined}
          className="font-data text-[0.8125rem]"
        />
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={item.isVisible ? `Hide ${item.label || "link"}` : `Show ${item.label || "link"}`}
            aria-pressed={!item.isVisible}
            onClick={() => onChange({ ...item, isVisible: !item.isVisible })}
            title={item.isVisible ? "Visible" : "Hidden"}
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
            aria-label={`Remove ${item.label || "link"}`}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      {errors[`${path}.label`] || errors[`${path}.href`] ? (
        <p className="text-[0.8125rem] text-error">{errors[`${path}.label`] ?? errors[`${path}.href`]}</p>
      ) : null}
      <Checkbox
        label="Open in a new tab"
        checked={item.newTab}
        onChange={(e) => onChange({ ...item, newTab: e.target.checked })}
        className="text-sm"
      />
    </div>
  );
}

function LocationEditor({ location, canEdit }) {
  const toast = useToast();
  const cfg = MENU_LOCATIONS[location];
  const [items, setItems] = useState(null);
  const [baseline, setBaseline] = useState("[]");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [history, setHistory] = useState(false);

  useEffect(() => {
    let live = true;
    adminJson(`/api/admin/menus/${location}`).then((res) => {
      if (!live) return;
      if (!res.ok) return setError(res.data?.error ?? "Could not load the menu.");
      setItems(withIds(res.data.items));
      setBaseline(JSON.stringify(res.data.items));
    });
    return () => {
      live = false;
    };
  }, [location]);

  const dirty = useMemo(() => items !== null && JSON.stringify(strip(items)) !== baseline, [items, baseline]);

  async function save() {
    const body = { items: strip(items) };
    const check = menuSchemaFor(location).safeParse(body);
    if (!check.success) {
      setErrors(Object.fromEntries(check.error.issues.map((i) => [i.path.join("."), i.message])));
      setError("Please fix the highlighted links.");
      return;
    }
    setSaving(true);
    setError("");
    setErrors({});
    const res = await adminJson(`/api/admin/menus/${location}`, { method: "PUT", json: check.data });
    setSaving(false);
    if (!res.ok) {
      setErrors(res.data?.fields ?? {});
      return setError(res.data?.error ?? "Could not save.");
    }
    setItems(withIds(res.data.items));
    setBaseline(JSON.stringify(res.data.items));
    setSavedAt(new Date());
    toast.success(`${cfg.label} saved.`);
  }

  if (error && items === null) return <Alert tone="error">{error}</Alert>;
  if (items === null) return <Skeleton className="h-64" />;

  const update = (id, next) => setItems((list) => list.map((i) => (i.id === id ? next : i)));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{cfg.hint}</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <fieldset disabled={!canEdit} className="flex flex-col gap-3">
        <SortableList
          items={items.map((i) => ({ ...i, label: i.label || "Untitled link" }))}
          disabled={!canEdit}
          onReorder={(next) => setItems(next.map((n) => items.find((i) => i.id === n.id)))}
          renderItem={(item) => {
            const idx = items.findIndex((i) => i.id === item.id);
            const real = items[idx];
            return (
              <div className="flex flex-col gap-3">
                <LinkRow
                  item={real}
                  errors={errors}
                  path={`items.${idx}`}
                  onChange={(n) => update(real.id, n)}
                  onRemove={() => setItems((l) => l.filter((i) => i.id !== real.id))}
                />
                {cfg.nested ? (
                  <div className="ml-2 flex flex-col gap-2 border-l-2 border-line pl-4">
                    {real.children.length ? (
                      <SortableList
                        items={real.children.map((c) => ({ ...c, label: c.label || "Untitled link" }))}
                        disabled={!canEdit}
                        onReorder={(next) =>
                          update(real.id, {
                            ...real,
                            children: next.map((n) => real.children.find((c) => c.id === n.id)),
                          })
                        }
                        renderItem={(child) => {
                          const cidx = real.children.findIndex((c) => c.id === child.id);
                          return (
                            <LinkRow
                              compact
                              item={real.children[cidx]}
                              errors={errors}
                              path={`items.${idx}.children.${cidx}`}
                              onChange={(n) =>
                                update(real.id, {
                                  ...real,
                                  children: real.children.map((c) => (c.id === child.id ? n : c)),
                                })
                              }
                              onRemove={() =>
                                update(real.id, {
                                  ...real,
                                  children: real.children.filter((c) => c.id !== child.id),
                                })
                              }
                            />
                          );
                        }}
                      />
                    ) : null}
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          update(real.id, {
                            ...real,
                            children: [
                              ...real.children,
                              { id: uid(), label: "", href: "/", newTab: false, isVisible: true },
                            ],
                          })
                        }
                      >
                        <Plus aria-hidden="true" /> Add sub-link
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          }}
        />
        {items.length < cfg.maxItems ? (
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setItems((l) => [
                  ...l,
                  { id: uid(), label: "", href: "/", newTab: false, isVisible: true, children: [] },
                ])
              }
            >
              <Plus aria-hidden="true" /> Add link
            </Button>
          </div>
        ) : null}
      </fieldset>
      {canEdit ? (
        <SaveBar
          dirty={dirty}
          saving={saving}
          savedAt={savedAt}
          onPublish={save}
          publishLabel="Save menu"
          onHistory={() => setHistory(true)}
        />
      ) : null}
      <RevisionHistory
        open={history}
        onClose={() => setHistory(false)}
        entity="menu"
        entityId={location.toLowerCase()}
        onRestore={(data) => {
          setItems(withIds(data.items ?? []));
          toast.info("Older version loaded. Save to make it live.");
        }}
      />
    </div>
  );
}

/** Menu builder (Phase 8 todo 04). */
export function MenuBuilder({ canEdit }) {
  const [location, setLocation] = useState("HEADER");
  return (
    <div className="flex flex-col gap-5">
      <div className="max-w-sm">
        <Select aria-label="Menu" value={location} onChange={(e) => setLocation(e.target.value)}>
          {Object.entries(MENU_LOCATIONS).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </Select>
      </div>
      <section className="rounded-card border border-line bg-card p-5">
        <LocationEditor key={location} location={location} canEdit={canEdit} />
      </section>
    </div>
  );
}
