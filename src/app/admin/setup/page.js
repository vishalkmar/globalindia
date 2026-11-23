import { Suspense } from "react";

import { AuthSkeleton } from "@/components/admin/auth/AuthCard";
import { requireAdminPage } from "@/lib/auth/guard";
import { passwordOnlyLogin } from "@/lib/env";

import { SetupWizard } from "./SetupWizard";

export const metadata = { title: "Account setup" };

async function SetupContent() {
  const user = await requireAdminPage({ allowSetup: true, next: "/admin/setup" });
  // With the temporary password-only switch the authenticator step is skipped (lib/env.js).
  return (
    <SetupWizard
      mustChangePassword={user.mustChangePassword}
      mfaSetupDone={Boolean(user.mfaSetupAt) || passwordOnlyLogin()}
    />
  );
}

export default function SetupPage() {
  return (
    <main id="main" className="min-h-dvh bg-surface px-4 py-12 sm:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow">
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-accent" />
            First sign-in
          </p>
          <h1 className="text-h2">Secure your admin account</h1>
          <p className="text-muted">Two short steps. You only do this once.</p>
        </div>
        <Suspense fallback={<AuthSkeleton />}>
          <SetupContent />
        </Suspense>
      </div>
    </main>
  );
}
