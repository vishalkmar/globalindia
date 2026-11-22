import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { EMAIL_KEYS, EMAIL_SAMPLES } from "@/lib/email/samples";

import { EmailPreview } from "./EmailPreview";

export const metadata = { title: "Emails" };

async function Content() {
  const user = await requirePermissionPage("read", "siteSettings", "/admin/emails");
  return (
    <EmailPreview
      templates={EMAIL_KEYS.map((k) => ({ key: k, label: EMAIL_SAMPLES[k].label }))}
      canSend={can(user, "update", "siteSettings")}
    />
  );
}

export default function EmailsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Emails"
        description="Every email the website sends, shown with sample data. Send a test to your own inbox to check how it looks."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}
