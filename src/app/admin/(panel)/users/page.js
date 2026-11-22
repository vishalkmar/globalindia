import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";

import { UsersManager } from "./UsersManager";

export const metadata = { title: "Users" };

async function Content() {
  const me = await requirePermissionPage("read", "users", "/admin/users");
  return <UsersManager me={{ id: me.id }} />;
}

export default function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in to this admin panel, and what each person can do."
      />
      <Suspense fallback={<Skeleton className="h-72" />}>
        <Content />
      </Suspense>
    </>
  );
}
