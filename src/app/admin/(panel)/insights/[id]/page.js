import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { PostEditor } from "./PostEditor";

export const metadata = { title: "Article" };

async function Content({ params }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !/^c[a-z0-9]{20,32}$/.test(id)) notFound();
  const user = await requirePermissionPage(isNew ? "create" : "read", "insights", `/admin/insights/${id}`);
  return (
    <PostEditor
      postId={isNew ? null : id}
      perms={{
        update: can(user, isNew ? "create" : "update", "insights"),
        publish: can(user, "publish", "insights"),
        delete: can(user, "delete", "insights"),
      }}
    />
  );
}

export default function PostAdminPage({ params }) {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
