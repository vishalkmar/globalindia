"use client";

import { Plus } from "lucide-react";

import { StatusBadge } from "@/components/admin/catalogue/StatusBadge";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { POST_CATEGORIES } from "@/lib/validation/content";

const when = (d) =>
  d
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(d))
    : "—";
const isScheduled = (p) => p.status === "PUBLISHED" && p.publishedAt && new Date(p.publishedAt) > new Date();

/** Insights list (Phase 15 todo 05). */
export function PostsManager({ canCreate }) {
  return (
    <>
      <PageHeader
        title="Insights"
        description="Articles for buyers: guides, quality notes, market news. Scheduled articles go live on their own."
        actions={
          canCreate ? (
            <Button href="/admin/insights/new" size="sm">
              <Plus aria-hidden="true" /> New article
            </Button>
          ) : null
        }
      />
      <DataTable
        endpoint="/api/admin/posts"
        caption="Articles"
        searchPlaceholder="Search titles"
        defaultSort={{ sort: "updatedAt", dir: "desc" }}
        rowHref={(p) => `/admin/insights/${p.id}`}
        columns={[
          {
            key: "title",
            label: "Title",
            sortable: true,
            render: (p) => (
              <span className="flex flex-col">
                <span className="font-semibold text-ink">{p.title}</span>
                <span className="font-data text-[0.75rem] text-muted">/insights/{p.slug}</span>
              </span>
            ),
          },
          { key: "category", label: "Topic" },
          {
            key: "status",
            label: "Status",
            sortable: true,
            render: (p) =>
              isScheduled(p) ? <Badge tone="accent">Scheduled</Badge> : <StatusBadge status={p.status} />,
          },
          {
            key: "publishedAt",
            label: "Published",
            sortable: true,
            render: (p) => <span className="text-sm text-muted">{when(p.publishedAt)}</span>,
          },
        ]}
        filters={[
          {
            key: "status",
            label: "Statuses",
            options: [
              { value: "PUBLISHED", label: "Published or scheduled" },
              { value: "DRAFT", label: "Draft" },
              { value: "ARCHIVED", label: "Archived" },
            ],
          },
          { key: "category", label: "Topics", options: POST_CATEGORIES.map((c) => ({ value: c, label: c })) },
        ]}
        empty={{
          title: "No articles yet",
          text: "Write the first one: a buying guide for your best-selling product works well.",
        }}
      />
    </>
  );
}
