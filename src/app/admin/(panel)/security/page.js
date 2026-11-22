import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requireAdminPage } from "@/lib/auth/guard";

import { SecurityPanel } from "./SecurityPanel";

export const metadata = { title: "My security" };

async function Guarded() {
  await requireAdminPage({ next: "/admin/security" });
  return <SecurityPanel />;
}

/** Account security for the signed-in user (Phase 5 todo 18). */
export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="My security"
        description="Sign-in methods, password, email and devices for your account."
      />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Guarded />
      </Suspense>
    </div>
  );
}
