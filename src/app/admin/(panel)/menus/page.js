import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { MenuBuilder } from "./MenuBuilder";

export const metadata = { title: "Menus" };

async function Content() {
  const user = await requirePermissionPage("read", "menus", "/admin/menus");
  return <MenuBuilder canEdit={can(user, "update", "menus")} />;
}

export default function MenusPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Menus"
        description="Links in the header, the products mega menu and the footer. Drag to reorder; hidden links stay saved but are not shown."
      />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Content />
      </Suspense>
    </div>
  );
}
