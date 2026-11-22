import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { PostsManager } from "./PostsManager";

export const metadata = { title: "Insights" };

async function Content() {
  const user = await requirePermissionPage("read", "insights", "/admin/insights");
  return <PostsManager canCreate={can(user, "create", "insights")} />;
}

export default function InsightsAdminPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
