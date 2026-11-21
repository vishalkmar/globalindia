import { managedMetadata, ManagedPage } from "@/components/site/ManagedPage";
import { HOME_LAYOUT } from "@/lib/sections/registry";

export function generateMetadata() {
  return managedMetadata("home", "/");
}

/** Home page (Phase 10): every section comes from Admin > Pages > Home. */
export default function HomePage() {
  return <ManagedPage slug="home" fallbackLayout={HOME_LAYOUT} />;
}
