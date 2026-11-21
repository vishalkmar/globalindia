"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/** POST logout (never GET), then a full reload so no admin data stays in memory or in the back/forward cache. */
export function LogoutButton({ className, variant = "ghost", label = "Sign out" }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      size="sm"
      loading={busy}
      className={cn(className)}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: "{}",
        }).catch(() => null);
        window.location.replace("/admin/login");
      }}
    >
      {!busy ? <LogOut aria-hidden="true" /> : null}
      {label}
    </Button>
  );
}
