import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { ThemeList } from "./ThemeList";

export const metadata = { title: "Theme" };

async function Content() {
  const user = await requirePermissionPage("read", "theme", "/admin/theme");
  const perms = Object.fromEntries(["create", "update", "delete", "publish"].map((a) => [a, can(user, a, "theme")]));
  return <ThemeList perms={perms} />;
}

export default function ThemePage() {
  return (
    <>
      <PageHeader title="Theme" description="Colours, fonts and shapes for the whole website. Prepare a theme, preview it, then make it live — no developer needed." />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Content />
      </Suspense>
    </>
  );
}
