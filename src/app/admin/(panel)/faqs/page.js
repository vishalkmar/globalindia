import { Suspense } from "react";

import { FaqsEditor } from "@/components/admin/CollectionEditors";
import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

export const metadata = { title: "FAQ" };

async function Content() {
  const user = await requirePermissionPage("read", "pages", "/admin/faqs");
  return <FaqsEditor canEdit={can(user, "update", "pages")} />;
}

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="FAQ" description="Questions on the FAQ page, grouped by topic." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
