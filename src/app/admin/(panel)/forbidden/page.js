import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/Static";

export const metadata = { title: "No access" };

/** Admin 403 (Phase 6 todo 16). */
export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 surface-card p-8">
      <IconBox icon={ShieldX} />
      <h1 className="text-h3">You do not have access to this page</h1>
      <p className="text-muted">Your role does not include this area. Ask the site owner if you need it.</p>
      <Button href="/admin" variant="secondary">
        Back to dashboard
      </Button>
    </div>
  );
}
