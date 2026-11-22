import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { GalleryManager } from "./GalleryManager";

export const metadata = { title: "Gallery" };

async function Content() {
  const user = await requirePermissionPage("read", "media", "/admin/gallery");
  return <GalleryManager canEdit={can(user, "update", "media")} />;
}

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Gallery"
        description="Photos on the public Gallery page. Each category becomes a filter button. Drag to reorder; hidden photos stay saved but are not shown."
      />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Content />
      </Suspense>
    </div>
  );
}
