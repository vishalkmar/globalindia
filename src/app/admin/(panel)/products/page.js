import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

import { ProductsManager } from "./ProductsManager";

export const metadata = { title: "Products" };

async function Content() {
  const user = await requirePermissionPage("read", "products", "/admin/products");
  const categories = await db.productCategory.findMany({
    where: { deletedAt: null },
    orderBy: [{ family: "asc" }, { order: "asc" }],
    select: { id: true, name: true },
  });
  return (
    <ProductsManager
      categories={categories}
      perms={{
        create: can(user, "create", "products"),
        import: can(user, "create", "products") && can(user, "update", "products"),
      }}
    />
  );
}

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
