import { Suspense } from "react";

import { ClientLogosEditor } from "@/components/admin/CollectionEditors";
import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

export const metadata = { title: "Client logos" };

async function Content() {
  const user = await requirePermissionPage("read", "media", "/admin/client-logos");
  return <ClientLogosEditor canEdit={can(user, "update", "media")} />;
}

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Client logos" description="Logos of customers who agreed to be shown." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
