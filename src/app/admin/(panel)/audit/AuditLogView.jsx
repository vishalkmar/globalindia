"use client";

import { useState } from "react";

import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { AUDIT_GROUPS } from "@/lib/admin/auditGroups";

const when = (d) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(d));

function tone(action) {
  if (/denied|failed|reuse|locked|blocked/.test(action)) return "error";
  if (/success|enabled|completed|create|invite/.test(action)) return "success";
  if (/disable|delete|revoke/.test(action)) return "accent";
  return "neutral";
}

/** Audit log viewer (Phase 6 todo 14). Read-only; entries cannot be edited or deleted from the UI. */
export function AuditLogView() {
  const [detail, setDetail] = useState(null);
  const columns = [
    {
      key: "at",
      label: "Time (IST)",
      sortable: true,
      render: (r) => <span className="font-data text-[0.8125rem] whitespace-nowrap">{when(r.at)}</span>,
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (r) => <Badge tone={tone(r.action)}>{r.action}</Badge>,
    },
    {
      key: "actor",
      label: "By",
      render: (r) =>
        r.actor ? r.actor.name || r.actor.email : <span className="text-muted">System / anonymous</span>,
    },
    {
      key: "entity",
      label: "On",
      render: (r) => (r.entity ? <span className="text-muted">{r.entity}</span> : "—"),
    },
    {
      key: "diff",
      label: "",
      align: "right",
      render: (r) =>
        r.diff ? (
          <button
            type="button"
            onClick={() => setDetail(r)}
            className="text-sm font-semibold text-primary underline underline-offset-4"
          >
            Details
          </button>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable
        caption="Audit log"
        endpoint="/api/admin/audit"
        columns={columns}
        defaultSort={{ sort: "at", dir: "desc" }}
        searchPlaceholder="Search action or record"
        filters={[
          { key: "group", label: "Areas", options: AUDIT_GROUPS },
          { key: "from", label: "From date", type: "date" },
          { key: "to", label: "To date", type: "date" },
        ]}
        empty={{
          title: "No entries",
          text: "Sign-ins, security changes and content edits are recorded here.",
        }}
      />
      <Dialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.action ?? ""}
        description={detail ? when(detail.at) : ""}
      >
        {detail ? (
          <pre className="overflow-x-auto rounded-btn bg-surface shadow-[inset_0_0_0_1px_var(--hairline)] p-4 font-data text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(detail.diff, null, 2)}
          </pre>
        ) : null}
      </Dialog>
    </>
  );
}
