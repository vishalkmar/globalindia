"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { SaveBar } from "@/components/admin/SaveBar";
import { ThemePreview } from "@/components/admin/theme/ThemePreview";
import { Badge } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Feedback";
import { Field, Input, RadioGroup, Select } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { themeNameSchema, themeTokensSchema } from "@/lib/settings/theme";
import { checkPairs, isHexColor } from "@/lib/theme/contrast";
import { COLOR_TOKENS, CONTRAST_PAIRS, FONT_WHITELIST, THEME_PRESETS } from "@/lib/theme/presets";
import { cn } from "@/lib/utils";

function ColorRow({ token, value, onChange, disabled }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]); // eslint-disable-line react-hooks/set-state-in-effect -- keep text box in sync with the picker
  return (
    <div className="grid grid-cols-[44px_1fr_110px] items-center gap-3 py-2">
      <input
        type="color"
        aria-label={`${token.label} colour picker`}
        value={isHexColor(value) ? value : "#000000"}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="size-11 cursor-pointer rounded-btn border border-line bg-card p-1 disabled:cursor-not-allowed"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{token.label}</p>
        <p className="truncate text-[0.75rem] text-muted">{token.hint}</p>
      </div>
      <Input
        size="sm"
        aria-label={`${token.label} hex value`}
        value={text}
        disabled={disabled}
        maxLength={7}
        onChange={(e) => {
          const v = e.target.value.trim();
          setText(v);
          if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toUpperCase());
        }}
        className="font-data uppercase"
        aria-invalid={!/^#[0-9a-fA-F]{6}$/.test(text) || undefined}
      />
    </div>
  );
}

function ContrastReport({ colors }) {
  const results = checkPairs(colors, CONTRAST_PAIRS);
  const failing = results.filter((r) => !r.pass);
  return (
    <div className="flex flex-col gap-2">
      {failing.length ? (
        <Alert
          tone="error"
          title={`${failing.length} colour pair${failing.length > 1 ? "s are" : " is"} hard to read`}
        >
          Text below the minimum contrast is hard to read for many visitors (and on phones in sunlight).
          Darken or lighten the colours listed.
        </Alert>
      ) : (
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CircleCheck aria-hidden="true" className="size-4" /> All text meets the WCAG AA contrast minimum.
        </p>
      )}
      <ul className="divide-y divide-line rounded-btn border border-line text-[0.8125rem]">
        {results.map((r) => (
          <li
            key={`${r.fg}-${r.bg}`}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5",
              !r.pass && "bg-[color-mix(in_oklab,var(--c-error)_6%,var(--c-card))]",
            )}
          >
            {r.pass ? (
              <CircleCheck aria-hidden="true" className="size-3.5 text-success" />
            ) : (
              <CircleAlert aria-hidden="true" className="size-3.5 text-error" />
            )}
            <span className="flex-1">{r.use}</span>
            <span className="font-data">
              {r.ratio.toFixed(2)} / {r.min}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Theme editor (Phase 8 todo 08-12). */
export function ThemeEditor({ themeId, perms }) {
  const toast = useToast();
  const [loaded, setLoaded] = useState(null);
  const [draft, setDraft] = useState(null);
  const [palette, setPalette] = useState("light");
  const [previewMode, setPreviewMode] = useState("light");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(false);

  useEffect(() => {
    let live = true;
    adminJson(`/api/admin/themes/${themeId}`).then((r) => {
      if (!live) return;
      if (!r.ok) return setError(r.data?.error ?? "Could not load the theme.");
      const t = r.data.theme;
      const d = { name: t.name, mode: t.mode, tokens: t.tokens };
      setLoaded({ ...t, snapshot: JSON.stringify(d) });
      setDraft(d);
      setPreviewMode(t.mode === "DARK" ? "dark" : "light");
    });
    return () => {
      live = false;
    };
  }, [themeId]);

  const dirty = useMemo(() => draft && loaded && JSON.stringify(draft) !== loaded.snapshot, [draft, loaded]);

  if (error && !draft) return <Alert tone="error">{error}</Alert>;
  if (!draft) return <Skeleton className="h-96" />;

  const locked = loaded.isActive && !perms.publish; // live theme: only super admin
  const canEdit = perms.update && !locked;
  const t = draft.tokens;
  const setTokens = (fn) => setDraft((d) => ({ ...d, tokens: fn(d.tokens) }));
  const setColor = (key, hex) =>
    setTokens((tk) => ({
      ...tk,
      colors: { ...tk.colors, [palette]: { ...tk.colors[palette], [key]: hex } },
    }));

  async function save(activate = false) {
    const nameOk = themeNameSchema.safeParse(draft.name);
    const tokensOk = themeTokensSchema.safeParse(draft.tokens);
    if (!nameOk.success || !tokensOk.success) {
      setError((nameOk.error ?? tokensOk.error).issues[0].message);
      return;
    }
    setSaving(true);
    setError("");
    const r = await adminJson(`/api/admin/themes/${themeId}`, {
      method: "PATCH",
      json: { name: nameOk.data, mode: draft.mode, tokens: tokensOk.data },
    });
    if (!r.ok) {
      setSaving(false);
      return setError(r.data?.error ?? "Could not save.");
    }
    if (activate) {
      const a = await adminJson(`/api/admin/themes/${themeId}/activate`, { method: "POST", json: {} });
      if (!a.ok) {
        setSaving(false);
        return setError(a.data?.error ?? "Saved, but could not make it live.");
      }
    }
    setSaving(false);
    const saved = r.data.theme;
    setLoaded({
      ...saved,
      isActive: activate || saved.isActive,
      snapshot: JSON.stringify({ name: saved.name, mode: saved.mode, tokens: saved.tokens }),
    });
    setSavedAt(new Date());
    toast.success(
      activate
        ? `"${saved.name}" saved and now live on the website.`
        : loaded.isActive
          ? "Saved. The website uses the new values now."
          : "Theme saved.",
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
      <div className="flex flex-col gap-6">
        {locked ? (
          <Alert tone="info" title="This theme is live">
            Only a super admin can change the live theme. Duplicate it from the theme list to try changes.
          </Alert>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        <fieldset disabled={!canEdit} className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 surface-card p-5">
            <div className="flex items-center gap-2">
              <h2 className="text-h4 text-primary">Basics</h2>
              {loaded.isActive ? <Badge tone="success">Live</Badge> : null}
            </div>
            <Field label="Theme name">
              <Input
                value={draft.name}
                maxLength={40}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </Field>
            <RadioGroup
              legend="Default look for visitors"
              name="mode"
              inline
              value={draft.mode}
              onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value }))}
              options={[
                { value: "LIGHT", label: "Light" },
                { value: "DARK", label: "Dark" },
              ]}
            />
            <Field
              label="Start from a preset"
              hint="Copies all colours and fonts from a built-in theme into this one."
            >
              <Select
                value=""
                onChange={(e) => {
                  const p = THEME_PRESETS.find((x) => x.slug === e.target.value);
                  if (p) setDraft((d) => ({ ...d, tokens: structuredClone(p.tokens) }));
                }}
              >
                <option value="">Choose a preset...</option>
                {THEME_PRESETS.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <section className="flex flex-col gap-3 surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h4 text-primary">Colours</h2>
              <div
                role="tablist"
                aria-label="Palette"
                className="inline-flex rounded-btn border border-line bg-surface p-1"
              >
                {["light", "dark"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={palette === m}
                    onClick={() => {
                      setPalette(m);
                      setPreviewMode(m);
                    }}
                    className={cn(
                      "rounded-[4px] px-3 py-1 text-sm font-semibold capitalize",
                      palette === m ? "bg-card text-primary" : "text-muted",
                    )}
                  >
                    {m} mode
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted">
              Keep to the brand rule: one main colour, one small accent, calm neutrals.
            </p>
            <div className="divide-y divide-line">
              {COLOR_TOKENS.map((token) => (
                <ColorRow
                  key={`${palette}-${token.key}`}
                  token={token}
                  value={t.colors[palette][token.key]}
                  disabled={!canEdit}
                  onChange={(hex) => setColor(token.key, hex)}
                />
              ))}
            </div>
            <ContrastReport colors={t.colors[palette]} />
          </section>

          <section className="grid gap-4 surface-card p-5 md:grid-cols-3">
            <h2 className="text-h4 text-primary md:col-span-3">Fonts</h2>
            {[
              ["display", "Headings"],
              ["body", "Body text"],
              ["data", "Data (CAS, specs)"],
            ].map(([kind, label]) => (
              <Field key={kind} label={label}>
                <Select
                  value={t.fonts[kind]}
                  onChange={(e) =>
                    setTokens((tk) => ({ ...tk, fonts: { ...tk.fonts, [kind]: e.target.value } }))
                  }
                >
                  {FONT_WHITELIST[kind].map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </section>

          <section className="grid gap-5 surface-card p-5 md:grid-cols-2">
            <h2 className="text-h4 text-primary md:col-span-2">Shape and spacing</h2>
            <Field label={`Button corners: ${t.radius.button} px`}>
              <input
                type="range"
                min={0}
                max={24}
                value={t.radius.button}
                onChange={(e) =>
                  setTokens((tk) => ({ ...tk, radius: { ...tk.radius, button: Number(e.target.value) } }))
                }
                className="accent-[var(--c-primary)]"
              />
            </Field>
            <Field label={`Card corners: ${t.radius.card} px`}>
              <input
                type="range"
                min={0}
                max={32}
                value={t.radius.card}
                onChange={(e) =>
                  setTokens((tk) => ({ ...tk, radius: { ...tk.radius, card: Number(e.target.value) } }))
                }
                className="accent-[var(--c-primary)]"
              />
            </Field>
            <Field label="Spacing between sections">
              <Select
                value={t.density}
                onChange={(e) => setTokens((tk) => ({ ...tk, density: e.target.value }))}
              >
                <option value="comfortable">Comfortable (96 px)</option>
                <option value="compact">Compact (64 px)</option>
              </Select>
            </Field>
            <Field label="Main button style">
              <Select
                value={t.buttonStyle}
                onChange={(e) => setTokens((tk) => ({ ...tk, buttonStyle: e.target.value }))}
              >
                <option value="solid">Solid</option>
                <option value="outline">Outline</option>
              </Select>
            </Field>
          </section>
        </fieldset>

        {canEdit ? (
          <SaveBar
            dirty={Boolean(dirty)}
            saving={saving}
            savedAt={savedAt}
            onSaveDraft={() => save(false)}
            saveLabel={loaded.isActive ? "Save (live)" : "Save"}
            onPublish={perms.publish && !loaded.isActive ? () => save(true) : undefined}
            publishLabel="Save and make live"
            onHistory={() => setHistory(true)}
          />
        ) : null}
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h4 text-primary">Live preview</h2>
          <div
            className="inline-flex rounded-btn border border-line bg-surface p-1"
            role="group"
            aria-label="Preview mode"
          >
            {["light", "dark"].map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={previewMode === m}
                onClick={() => setPreviewMode(m)}
                className={cn(
                  "rounded-[4px] px-3 py-1 text-sm font-semibold capitalize",
                  previewMode === m ? "bg-card text-primary" : "text-muted",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <ThemePreview tokens={t} mode={previewMode} />
        <p className="mt-2 text-[0.8125rem] text-muted">
          Unsaved changes show here only. The website changes when this theme is saved while live, or made
          live.
        </p>
      </aside>

      <RevisionHistory
        open={history}
        onClose={() => setHistory(false)}
        entity="theme"
        entityId={themeId}
        onRestore={(data) => {
          setDraft({ name: data.name, mode: data.mode, tokens: data.tokens });
          toast.info("Older version loaded. Save to keep it.");
        }}
      />
    </div>
  );
}
