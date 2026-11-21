import { Suspense } from "react";

import { AuthSkeleton } from "@/components/admin/auth/AuthCard";

import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
