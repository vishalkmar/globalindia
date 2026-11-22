import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { ThemeEditor } from "./ThemeEditor";

export const metadata = { title: "Edit theme" };

async function Content({ params }) {
  const { id } = await params;
  if (!/^c[a-z0-9]{20,32}$/.test(id)) notFound();
  const user = await requirePermissionPage("read", "theme", `/admin/theme/${id}`);
  const perms = Object.fromEntries(["update", "publish"].map((a) => [a, can(user, a, "theme")]));
  return <ThemeEditor themeId={id} perms={perms} />;
}

export default function ThemeEditPage({ params }) {
  return (
    <>
      <PageHeader
        title="Edit theme"
        description="Changes show in the preview straight away. The website only changes when this theme is live."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </>
  );
}
