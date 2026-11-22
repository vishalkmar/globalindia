import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

import { ProductEditor } from "./ProductEditor";

export const metadata = { title: "Product" };

async function Content({ params }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^c[a-z0-9]{20,32}$/.test(id)) notFound();
  const user = await requirePermissionPage(isNew ? "create" : "read", "products", `/admin/products/${id}`);
  const categories = await db.productCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ family: "asc" }, { order: "asc" }],
    select: { id: true, name: true, slug: true },
  });
  return (
    <ProductEditor
      productId={isNew ? null : id}
      categories={categories}
      perms={{
        update: can(user, isNew ? "create" : "update", "products"),
        publish: can(user, "publish", "products"),
        create: can(user, "create", "products"),
        delete: can(user, "delete", "products"),
      }}
    />
  );
}

export default function ProductPage({ params }) {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
