import { MaintenanceGate } from "@/components/site/MaintenanceGate";

/**
 * Public website layout. Phase 9 adds the top bar, header, mega menu and footer here.
 */
export default function SiteLayout({ children }) {
  return <MaintenanceGate>{children}</MaintenanceGate>;
}
