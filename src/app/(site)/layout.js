import { MaintenanceGate } from "@/components/site/MaintenanceGate";
import { SiteShell } from "@/components/site/SiteShell";

/** Public website layout: maintenance gate around the full page frame (header, footer...). */
export default function SiteLayout({ children }) {
  return (
    <MaintenanceGate>
      <SiteShell>{children}</SiteShell>
    </MaintenanceGate>
  );
}
