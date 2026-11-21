import { Suspense } from "react";

import { AuthSkeleton } from "@/components/admin/auth/AuthCard";

import { VerifyForm } from "./VerifyForm";

export const metadata = { title: "Verify" };

export default function VerifyPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <VerifyForm />
    </Suspense>
  );
}
