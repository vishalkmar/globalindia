import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState, PageHeader } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/Card";
import { IconBox, Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { pagePublicPath } from "@/lib/pagePath";

export const metadata = { title: "Pages" };

const when = (d) =>
  d
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(d)
    : "Never";

async function List() {
  await requirePermissionPage("read", "pages", "/admin/pages");
  const pages = await db.page.findMany({
    where: { deletedAt: null },
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      draftAt: true,
      _count: { select: { sections: true } },
    },
  });
  if (!pages.length)
    return (
      <EmptyState
        icon={FileText}
        title="No pages yet"
        text="Run the database seed to create the home page."
      />
    );
  return (
    <ul className="flex flex-col gap-3">
      {pages.map((p) => (
        <li key={p.id}>
          <Link
            href={`/admin/pages/${p.id}`}
            className="flex items-center gap-4 rounded-card border border-line bg-card p-4 transition-colors hover:border-primary"
          >
            <IconBox icon={FileText} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                {p.title}
                <Badge tone={p.status === "PUBLISHED" ? "success" : "neutral"}>
                  {p.status === "PUBLISHED" ? "Published" : "Not published"}
                </Badge>
                {p.draftAt ? <Badge tone="accent">Unpublished changes</Badge> : null}
              </p>
              <p className="text-sm text-muted">
                <span className="font-data">{pagePublicPath(p.slug)}</span> · {p._count.sections} sections ·
                published {when(p.publishedAt)}
              </p>
            </div>
            <ChevronRight aria-hidden="true" className="size-5 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function PagesIndex() {
  return (
    <>
      <PageHeader
        title="Pages"
        description="Website pages built from sections. Company pages (About, Why us, Quality) are added in the next phase."
      />
      <Suspense fallback={<Skeleton className="h-40" />}>
        <List />
      </Suspense>
    </>
  );
}
