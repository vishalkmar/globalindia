import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/Static";

/** Admin 404 (Phase 6 todo 16), shown inside the admin shell. */
export default function AdminNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-card border border-line bg-card p-8">
      <IconBox icon={SearchX} />
      <h1 className="text-h3">Page not found</h1>
      <p className="text-muted">This admin page does not exist, or the item was deleted.</p>
      <Button variant="secondary" href="/admin">
        Back to dashboard
      </Button>
    </div>
  );
}
