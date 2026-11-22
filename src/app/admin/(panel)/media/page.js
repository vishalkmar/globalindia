import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { cloudinaryEnabled } from "@/lib/cloudinary";

import { MediaLibrary } from "./MediaLibrary";

export const metadata = { title: "Media" };

async function Content() {
  const user = await requirePermissionPage("read", "media", "/admin/media");
  return (
    <MediaLibrary
      canUpload={can(user, "create", "media")}
      driver={cloudinaryEnabled() ? "cloudinary" : "local"}
    />
  );
}

export default function MediaPage() {
  return (
    <>
      <PageHeader
        title="Media"
        description="Photos, logos and PDF documents used across the website. Upload once, use anywhere."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </>
  );
}
