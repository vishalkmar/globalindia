import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { pagePublicPath } from "@/lib/pagePath";

import { PageEditor } from "./PageEditor";

export const metadata = { title: "Edit page" };

async function Content({ params }) {
  const { id } = await params;
  if (!/^c[a-z0-9]{20,32}$/.test(id)) notFound();
  const user = await requirePermissionPage("read", "pages", `/admin/pages/${id}`);
  const page = await db.page.findFirst({
    where: { id, deletedAt: null },
    select: { title: true, slug: true },
  });
  if (!page) notFound();
  return (
    <>
      <PageHeader
        title={page.title}
        description={`Address: ${pagePublicPath(page.slug)}`}
      />
      <PageEditor
        pageId={id}
        perms={{ update: can(user, "update", "pages"), publish: can(user, "publish", "pages") }}
      />
    </>
  );
}

export default function EditPagePage({ params }) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Content params={params} />
    </Suspense>
  );
}
