import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";

import { AuditLogView } from "./AuditLogView";

export const metadata = { title: "Audit log" };

async function Content() {
  await requirePermissionPage("read", "audit", "/admin/audit");
  return <AuditLogView />;
}

export default function AuditPage() {
  return (
    <>
      <PageHeader title="Audit log" description="Every sign-in, security change and edit, with who did it and when. Secrets are never recorded." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </>
  );
}
