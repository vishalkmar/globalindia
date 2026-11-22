import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

import { EnquiryDetail } from "./EnquiryDetail";

export const metadata = { title: "Enquiry" };

async function Content({ params }) {
  const { id } = await params;
  if (!/^c[a-z0-9]{20,32}$/.test(id)) notFound();
  const user = await requirePermissionPage("read", "enquiries", `/admin/enquiries/${id}`);
  return <EnquiryDetail enquiryId={id} canEdit={can(user, "update", "enquiries")} />;
}

export default function EnquiryPage({ params }) {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content params={params} />
      </Suspense>
    </div>
  );
}
