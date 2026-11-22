import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { CategoryEditor } from "./CategoryEditor";

export const metadata = { title: "Category" };

async function Content({ params }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^c[a-z0-9]{20,32}$/.test(id)) notFound();
  const user = await requirePermissionPage(
    isNew ? "create" : "read",
    "categories",
    `/admin/categories/${id}`,
  );
  return (
    <CategoryEditor
      categoryId={isNew ? null : id}
      perms={{
        update: can(user, isNew ? "create" : "update", "categories"),
        publish: can(user, "publish", "categories"),
        delete: can(user, "delete", "categories"),
      }}
    />
  );
}

export default function CategoryPage({ params }) {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
