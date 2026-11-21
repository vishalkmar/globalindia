import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";

import { ComponentsDemo } from "./ComponentsDemo";

export const metadata = { title: "Admin components" };

async function Guarded() {
  await requirePermissionPage("read", "dashboard", "/admin/components");
  return <ComponentsDemo />;
}

/**
 * Dev-only gallery of the admin editing kit (FormBuilder, rich text, reorder, save bar).
 * The real editors (pages, products, settings) use these from Phase 8 onwards.
 */
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "true") notFound();
  return (
    <>
      <PageHeader title="Admin components" description="Editing kit used by every admin form. Nothing on this page is saved." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Guarded />
      </Suspense>
    </>
  );
}
