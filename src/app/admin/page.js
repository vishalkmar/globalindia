import { ShieldCheck } from "lucide-react";
import { Suspense } from "react";

import { LogoutButton } from "@/components/admin/LogoutButton";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Static";
import { requireAdminPage } from "@/lib/auth/guard";

export const metadata = { title: "Dashboard" };

async function Welcome() {
  const user = await requireAdminPage({ next: "/admin" });
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow">
          <span aria-hidden="true" className="inline-block h-px w-6 bg-accent" />
          {user.role.replace("_", " ").toLowerCase()}
        </p>
        <h1 className="text-h2">Signed in as {user.email}</h1>
        <p className="text-muted">The full dashboard, page editor and catalogue manager arrive in the next phases.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button href="/admin/security" variant="secondary">
          <ShieldCheck aria-hidden="true" /> Security settings
        </Button>
        <LogoutButton variant="ghost" />
      </div>
    </div>
  );
}

/** Temporary dashboard; Phase 6 replaces it with the admin shell. */
export default function AdminHome() {
  return (
    <main id="main" className="min-h-dvh bg-surface px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-card border border-line bg-card p-8">
        <Suspense fallback={<Skeleton lines={4} />}>
          <Welcome />
        </Suspense>
      </div>
    </main>
  );
}
