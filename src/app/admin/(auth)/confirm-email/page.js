import { Suspense } from "react";

import { AuthSkeleton } from "@/components/admin/auth/AuthCard";

import { ConfirmEmail } from "./ConfirmEmail";

export const metadata = { title: "Confirm email", referrer: "no-referrer" };

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ConfirmEmail />
    </Suspense>
  );
}
