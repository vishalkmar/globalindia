import { Plus } from "lucide-react";
import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { CategoriesManager } from "./CategoriesManager";

export const metadata = { title: "Categories" };

async function Content() {
  const user = await requirePermissionPage("read", "categories", "/admin/categories");
  return (
    <>
      <PageHeader
        title="Categories"
        description="Product categories grouped by family. Drag to change the order they appear in on the website."
        actions={
          can(user, "create", "categories") ? (
            <Button href="/admin/categories/new" size="sm">
              <Plus aria-hidden="true" /> New category
            </Button>
          ) : null
        }
      />
      <CategoriesManager canEdit={can(user, "update", "categories")} />
    </>
  );
}

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
