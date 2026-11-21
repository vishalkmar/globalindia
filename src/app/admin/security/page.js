import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { LogoutButton } from "@/components/admin/LogoutButton";
import { Skeleton } from "@/components/ui/Static";
import { requireAdminPage } from "@/lib/auth/guard";

import { SecurityPanel } from "./SecurityPanel";

export const metadata = { title: "Security" };

async function Guarded() {
  await requireAdminPage({ next: "/admin/security" });
  return <SecurityPanel />;
}

/** Account security (Phase 5 todo 18). Phase 6 moves this inside the full admin shell. */
export default function SecurityPage() {
  return (
    <main id="main" className="min-h-dvh bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            <ArrowLeft aria-hidden="true" className="size-4" /> Dashboard
          </Link>
          <LogoutButton />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-h2">Security</h1>
          <p className="text-muted">Sign-in methods, password, email and devices for your account.</p>
        </div>
        <Suspense fallback={<Skeleton className="h-64" />}>
          <Guarded />
        </Suspense>
      </div>
    </main>
  );
}
