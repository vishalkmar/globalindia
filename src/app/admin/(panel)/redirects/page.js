import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { RedirectsManager } from "./RedirectsManager";

export const metadata = { title: "Redirects" };

async function Content() {
  const user = await requirePermissionPage("read", "seo", "/admin/redirects");
  return <RedirectsManager canEdit={can(user, "update", "seo")} />;
}

export default function RedirectsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
