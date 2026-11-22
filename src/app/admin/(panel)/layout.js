import { Suspense } from "react";

import { AdminShell, AdminShellSkeleton } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/auth/guard";

/**
 * Shell for every signed-in admin page. The layout checks the session, but each page ALSO checks
 * its own permission (layouts are not re-run on every client navigation, so they are not a security boundary).
 */
async function Shell({ children }) {
  const user = await requireAdminPage();
  return (
    <AdminShell user={{ id: user.id, name: user.name, email: user.email, role: user.role }}>
      {children}
    </AdminShell>
  );
}

export default function PanelLayout({ children }) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
