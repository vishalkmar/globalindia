import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { StatusBadge } from "@/components/admin/catalogue/StatusBadge";
import { PageHeader } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export const metadata = { title: "Industries" };

async function Content() {
  const user = await requirePermissionPage("read", "industries", "/admin/industries");
  const rows = await db.industry.findMany({
    where: { deletedAt: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });
  return (
    <>
      <PageHeader
        title="Industries"
        description="Industry pages: what buyers in each industry need and the products they use."
        actions={
          can(user, "create", "industries") ? (
            <Button href="/admin/industries/new" size="sm">
              <Plus aria-hidden="true" /> New industry
            </Button>
          ) : null
        }
      />
      <ul className="flex flex-col divide-y divide-line surface-card">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/industries/${r.id}`}
              className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-surface"
              data-testid="industry-row"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{r.name}</span>
                <span className="block font-data text-[0.75rem] text-muted">/industries/{r.slug}</span>
              </span>
              <span className="text-sm text-muted">{r._count.products} products</span>
              <StatusBadge status={r.status} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function IndustriesAdminPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
