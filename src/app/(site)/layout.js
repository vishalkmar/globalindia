import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { MaintenanceGate } from "@/components/site/MaintenanceGate";
import { SiteShell } from "@/components/site/SiteShell";

/** Public website layout: maintenance gate around the full page frame (header, footer...). */
export default function SiteLayout({ children }) {
  return (
    <>
      <OrganizationJsonLd />
      <MaintenanceGate>
        <SiteShell>{children}</SiteShell>
      </MaintenanceGate>
    </>
  );
}
