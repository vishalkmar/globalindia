import { Suspense } from "react";

import { TestimonialsEditor } from "@/components/admin/CollectionEditors";
import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

export const metadata = { title: "Testimonials" };

async function Content() {
  const user = await requirePermissionPage("read", "pages", "/admin/testimonials");
  return <TestimonialsEditor canEdit={can(user, "update", "pages")} />;
}

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Testimonials" description="What real customers say about working with you." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
