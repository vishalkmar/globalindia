import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/Static";

export const metadata = { title: "No access" };

export default function ForbiddenPage() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="flex max-w-md flex-col items-start gap-5 rounded-card border border-line bg-card p-8">
        <IconBox icon={ShieldX} />
        <h1 className="text-h3">You do not have access to this page</h1>
        <p className="text-muted">Your role does not include this area. Ask the site owner if you need it.</p>
        <Button href="/admin" variant="secondary">
          Back to dashboard
        </Button>
      </div>
    </main>
  );
}
