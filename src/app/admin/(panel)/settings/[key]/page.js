import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { SETTINGS_FIELDS } from "@/components/admin/settings/fields";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { SETTINGS } from "@/lib/settings/schemas";

import { SettingsEditor } from "./SettingsEditor";

async function Content({ params }) {
  const { key } = await params;
  if (!Object.hasOwn(SETTINGS, key)) notFound();
  const user = await requirePermissionPage("read", SETTINGS[key].resource, `/admin/settings/${key}`);
  return (
    <>
      <PageHeader title={SETTINGS[key].label} description={SETTINGS_FIELDS[key].description} />
      <SettingsEditor settingKey={key} canEdit={can(user, "update", SETTINGS[key].resource)} />
    </>
  );
}

export default function SettingsKeyPage({ params }) {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
