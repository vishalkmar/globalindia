import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";

import { EnquiriesInbox } from "./EnquiriesInbox";

export const metadata = { title: "Enquiries" };

async function Content() {
  await requirePermissionPage("read", "enquiries", "/admin/enquiries");
  return <EnquiriesInbox />;
}

export default function EnquiriesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
