import { Suspense } from "react";

import { AuthSkeleton } from "@/components/admin/auth/AuthCard";

import { ResetForm } from "./ResetForm";

export const metadata = { title: "Reset password", referrer: "no-referrer" };

export default function ResetPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <ResetForm />
    </Suspense>
  );
}
