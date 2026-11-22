import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

import { IndustryEditor } from "./IndustryEditor";

export const metadata = { title: "Industry" };

async function Content({ params }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^c[a-z0-9]{20,32}$/.test(id)) notFound();
  const user = await requirePermissionPage(
    isNew ? "create" : "read",
    "industries",
    `/admin/industries/${id}`,
  );
  const products = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: [{ category: { family: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, category: { select: { name: true } } },
  });
  return (
    <IndustryEditor
      industryId={isNew ? null : id}
      products={products.map((p) => ({ id: p.id, name: p.name, category: p.category.name }))}
      perms={{
        update: can(user, isNew ? "create" : "update", "industries"),
        publish: can(user, "publish", "industries"),
        delete: can(user, "delete", "industries"),
      }}
    />
  );
}

export default function IndustryAdminPage({ params }) {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
