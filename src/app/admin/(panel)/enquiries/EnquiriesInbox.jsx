"use client";

import { Download } from "lucide-react";
import { useCallback, useState } from "react";

import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/Card";

export const TYPE_LABEL = { QUOTE: "Quote", CONTACT: "Message", SAMPLE: "Sample", CALLBACK: "Callback" };
export const STATUS = {
  NEW: ["New", "accent"],
  IN_PROGRESS: ["In progress", "primary"],
  QUOTED: ["Quoted", "primary"],
  WON: ["Won", "success"],
  LOST: ["Lost", "neutral"],
  SPAM: ["Spam", "error"],
  CLOSED: ["Closed", "neutral"],
};
export const StatusBadge = ({ status }) => (
  <Badge tone={STATUS[status]?.[1] ?? "neutral"}>{STATUS[status]?.[0] ?? status}</Badge>
);

const when = (d) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(d));

/** Enquiries inbox (Phase 14 todos 12, 14): search, filters, status, assignee, CSV of the current view. */
export function EnquiriesInbox() {
  const [query, setQuery] = useState("");
  const onQuery = useCallback((q) => setQuery(q), []);
  const exportHref = `/api/admin/enquiries/export?${new URLSearchParams([...new URLSearchParams(query)].filter(([k]) => !["page", "pageSize", "sort", "dir"].includes(k)))}`;

  const columns = [
    {
      key: "createdAt",
      label: "Received",
      sortable: true,
      render: (e) => <span className="text-sm whitespace-nowrap text-muted">{when(e.createdAt)}</span>,
    },
    {
      key: "name",
      label: "From",
      sortable: true,
      render: (e) => (
        <span className="flex flex-col">
          <span className="font-semibold text-ink">{e.name}</span>
          <span className="text-[0.8125rem] text-muted">
            {[e.company, e.city].filter(Boolean).join(", ") || e.email || e.phone}
          </span>
        </span>
      ),
    },
    { key: "type", label: "Type", sortable: true, render: (e) => TYPE_LABEL[e.type] },
    {
      key: "products",
      label: "Products",
      render: (e) => (
        <span className="text-sm">
          {e.productNames.length
            ? e.productNames.slice(0, 2).join(", ") +
              (e.productNames.length > 2 ? ` +${e.productNames.length - 2}` : "")
            : "—"}
        </span>
      ),
    },
    { key: "status", label: "Status", sortable: true, render: (e) => <StatusBadge status={e.status} /> },
    {
      key: "assigned",
      label: "Assigned",
      render: (e) => (
        <span className="text-sm text-muted">
          {e.assignedTo ? e.assignedTo.name || e.assignedTo.email : "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Quotes, samples, callbacks and messages from the website. Spam is hidden unless you filter for it."
        actions={
          <a
            href={exportHref}
            download
            className="inline-flex h-9 items-center gap-2 rounded-btn border border-primary px-3.5 text-sm font-semibold text-primary hover:bg-[color-mix(in_oklab,var(--c-primary)_7%,transparent)] [&_svg]:size-4"
          >
            <Download aria-hidden="true" /> Export this view
          </a>
        }
      />
      <DataTable
        endpoint="/api/admin/enquiries"
        caption="Enquiries"
        columns={columns}
        onQuery={onQuery}
        searchPlaceholder="Search name, company, email, phone, city or message"
        defaultSort={{ sort: "createdAt", dir: "desc" }}
        rowHref={(e) => `/admin/enquiries/${e.id}`}
        filters={[
          {
            key: "status",
            label: "Statuses",
            options: [
              { value: "OPEN", label: "Open (new, in progress, quoted)" },
              ...Object.entries(STATUS).map(([value, [label]]) => ({ value, label })),
            ],
          },
          {
            key: "type",
            label: "Types",
            options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })),
          },
          {
            key: "assigned",
            label: "Assignees",
            options: [
              { value: "me", label: "Assigned to me" },
              { value: "none", label: "Not assigned" },
            ],
          },
          { key: "from", label: "From date", type: "date" },
          { key: "to", label: "To date", type: "date" },
        ]}
        empty={{
          title: "No enquiries yet",
          text: "New quote requests and messages from the website appear here.",
        }}
      />
    </>
  );
}
