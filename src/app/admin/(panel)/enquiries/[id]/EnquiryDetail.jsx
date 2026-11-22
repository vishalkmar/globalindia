"use client";

import { ExternalLink, Mail, MessageSquareText, Phone } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Feedback";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Alert, Skeleton } from "@/components/ui/Static";
import { adminJson } from "@/lib/client/adminFetch";
import { ENQUIRY_STATUSES } from "@/lib/validation/enquiry";

import { STATUS, StatusBadge, TYPE_LABEL } from "../EnquiriesInbox";

const when = (d) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(d));

function describe(ev) {
  if (ev.kind === "received")
    return ev.diff?.reasons?.length
      ? `Received from the website (filed as spam: ${ev.diff.reasons.join("; ")})`
      : "Received from the website";
  if (ev.kind === "note") return null;
  const parts = [];
  if (ev.diff?.status)
    parts.push(
      `status ${STATUS[ev.diff.status[0]]?.[0] ?? ev.diff.status[0]} → ${STATUS[ev.diff.status[1]]?.[0] ?? ev.diff.status[1]}`,
    );
  if (ev.diff?.assignedTo)
    parts.push(ev.diff.assignedTo[1] ? `assigned to ${ev.diff.assignedTo[1]}` : "unassigned");
  return parts.length ? `Changed ${parts.join(", ")}` : "Updated";
}

/** Enquiry detail with timeline (Phase 14 todo 13). */
export function EnquiryDetail({ enquiryId, canEdit }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await adminJson(`/api/admin/enquiries/${enquiryId}`);
    if (!r.ok)
      return setError(
        r.status === 404 ? "This enquiry does not exist." : (r.data?.error ?? "Could not load the enquiry."),
      );
    setData(r.data);
  }, [enquiryId]);

  useEffect(() => {
    let live = true;
    adminJson(`/api/admin/enquiries/${enquiryId}`).then((r) => {
      if (!live) return;
      if (!r.ok)
        return setError(
          r.status === 404
            ? "This enquiry does not exist."
            : (r.data?.error ?? "Could not load the enquiry."),
        );
      setData(r.data);
    });
    return () => {
      live = false;
    };
  }, [enquiryId]);

  async function update(patch, message) {
    setBusy(true);
    const r = await adminJson(`/api/admin/enquiries/${enquiryId}`, { method: "PATCH", json: patch });
    setBusy(false);
    if (!r.ok) return toast.error(r.data?.error ?? "Could not save.");
    toast.success(message);
    load();
  }

  async function addNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    const r = await adminJson(`/api/admin/enquiries/${enquiryId}/notes`, {
      method: "POST",
      json: { text: note },
    });
    setBusy(false);
    if (!r.ok) return toast.error(r.data?.error ?? "Could not add the note.");
    setNote("");
    toast.success("Note added.");
    load();
  }

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!data) return <Skeleton className="h-96" />;
  const e = data.enquiry;
  const facts = [
    ["Reference", e.reference],
    ["Received", when(e.createdAt)],
    ["Company", e.company],
    ["City", e.city],
    ["Quantity", e.quantity],
    ["Pack size", e.packSize],
    ["Sent from page", e.source],
    ["Spam score", `${e.spamScore} / 100`],
  ].filter(([, v]) => v);

  return (
    <>
      <PageHeader
        title={`${TYPE_LABEL[e.type]} from ${e.name}`}
        description={`${e.reference} · ${when(e.createdAt)}`}
        actions={
          <>
            {e.phone ? (
              <Button href={`tel:${e.phone.replace(/[^\d+]/g, "")}`} variant="secondary" size="sm">
                <Phone aria-hidden="true" /> {e.phone}
              </Button>
            ) : null}
            {e.email ? (
              <Button
                href={`mailto:${e.email}?subject=${encodeURIComponent(`Your enquiry ${e.reference} — Global India`)}`}
                variant="secondary"
                size="sm"
              >
                <Mail aria-hidden="true" /> Reply by email
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-5">
          <section
            className="flex flex-col gap-4 rounded-card border border-line bg-card p-5"
            aria-labelledby="enq-details"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="enq-details" className="font-display text-lg text-primary">
                Details
              </h2>
              <StatusBadge status={e.status} />
            </div>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
              <dt className="text-sm text-muted">Email</dt>
              <dd className="break-all">{e.email || "—"}</dd>
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-sm text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {data.products.length ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted">Products</h3>
                <ul className="flex flex-col gap-1">
                  {data.products.map((p) => (
                    <li key={p.id}>
                      {p.deletedAt ? (
                        <span>{p.name} (deleted)</span>
                      ) : (
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {p.name}
                        </Link>
                      )}{" "}
                      {!p.deletedAt ? (
                        <a
                          href={`/products/${p.category.slug}/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View ${p.name} on the website`}
                          className="inline-flex align-middle text-muted hover:text-primary"
                        >
                          <ExternalLink aria-hidden="true" className="size-3.5" />
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {e.message ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted">Message</h3>
                <p className="whitespace-pre-wrap text-ink">{e.message}</p>
              </div>
            ) : null}
          </section>

          <section
            className="flex flex-col gap-4 rounded-card border border-line bg-card p-5"
            aria-labelledby="enq-timeline"
          >
            <h2 id="enq-timeline" className="font-display text-lg text-primary">
              Timeline
            </h2>
            <ol className="flex flex-col gap-4 border-l-2 border-line pl-5" data-testid="timeline">
              {data.timeline.map((ev) => (
                <li key={ev.id} className="relative flex flex-col gap-1">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-card bg-primary"
                  />
                  <span className="text-[0.75rem] text-muted">
                    {when(ev.at)} · {ev.by}
                  </span>
                  {ev.kind === "note" ? (
                    <p className="flex gap-2 rounded-btn bg-surface px-3 py-2 whitespace-pre-wrap text-ink">
                      <MessageSquareText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                      {ev.text}
                    </p>
                  ) : (
                    <p className="text-ink">{describe(ev)}</p>
                  )}
                </li>
              ))}
            </ol>
            {canEdit ? (
              <form onSubmit={addNote} className="flex flex-col gap-3">
                <Field
                  label="Add an internal note"
                  hint="Only admins see notes. The customer is never sent them."
                >
                  <Textarea
                    rows={3}
                    value={note}
                    onChange={(ev) => setNote(ev.target.value)}
                    maxLength={2000}
                  />
                </Field>
                <div>
                  <Button type="submit" size="sm" loading={busy} disabled={!note.trim()}>
                    Add note
                  </Button>
                </div>
              </form>
            ) : null}
          </section>
        </div>

        <aside
          className="flex flex-col gap-4 self-start rounded-card border border-line bg-card p-5"
          aria-label="Work this enquiry"
        >
          <Field label="Status">
            <Select
              value={e.status}
              disabled={!canEdit || busy}
              onChange={(ev) => update({ status: ev.target.value }, "Status updated.")}
            >
              {ENQUIRY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS[s][0]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assigned to">
            <Select
              value={e.assignedToId ?? ""}
              disabled={!canEdit || busy}
              onChange={(ev) => update({ assignedToId: ev.target.value || null }, "Assignment saved.")}
            >
              <option value="">Nobody</option>
              {data.assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.email}
                </option>
              ))}
            </Select>
          </Field>
          {!canEdit ? (
            <p className="text-sm text-muted">Your role can read enquiries but not change them.</p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
