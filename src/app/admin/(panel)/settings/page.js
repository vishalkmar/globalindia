import { BarChart3, Building2, ChevronRight, Construction, Globe, PanelBottom, PanelTop, Search, Share2, Upload } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/admin/EmptyState";
import { SETTINGS_FIELDS } from "@/components/admin/settings/fields";
import { IconBox, Skeleton } from "@/components/ui/Static";
import { requirePermissionPage } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { SETTINGS } from "@/lib/settings/schemas";

export const metadata = { title: "Settings" };

const ICONS = {
  business: Building2,
  topbar: PanelTop,
  header: Globe,
  footer: PanelBottom,
  social: Share2,
  seo: Search,
  analytics: BarChart3,
  maintenance: Construction,
  uploads: Upload,
};

async function Cards() {
  const user = await requirePermissionPage("read", "siteSettings", "/admin/settings");
  const keys = Object.keys(SETTINGS).filter((k) => can(user, "read", SETTINGS[k].resource));
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {keys.map((key) => (
        <li key={key}>
          <Link href={`/admin/settings/${key}`} className="flex h-full items-start gap-4 rounded-card border border-line bg-card p-5 transition-colors hover:border-primary">
            <IconBox icon={ICONS[key]} />
            <span className="flex flex-1 flex-col gap-1">
              <span className="flex items-center justify-between font-semibold text-ink">
                {SETTINGS[key].label}
                <ChevronRight aria-hidden="true" className="size-4 text-muted" />
              </span>
              <span className="text-sm text-muted">{SETTINGS_FIELDS[key].description}</span>
              {!can(user, "update", SETTINGS[key].resource) ? <span className="text-[0.75rem] font-semibold text-muted uppercase">View only</span> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Company details and the parts of the website that appear on every page." />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Cards />
      </Suspense>
    </>
  );
}
