import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requireAdminPage } from "@/lib/auth/guard";

import { TrashList } from "./TrashList";

export const metadata = { title: "Trash" };

async function Content() {
  const user = await requireAdminPage({ next: "/admin/trash" });
  return <TrashList canDestroy={user.role === "SUPER_ADMIN"} />;
}

export default function TrashPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Trash"
        description="Deleted products, categories, articles, industries, pages and files. They can be restored for 30 days, then they are removed for good."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
