import { Inbox } from "lucide-react";

import { IconBox } from "@/components/ui/Static";

/** Empty list state (Phase 16 todo 14 uses it everywhere). */
export function EmptyState({ icon = Inbox, title, text, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <IconBox icon={icon} />
      <p className="font-semibold text-ink">{title}</p>
      {text ? <p className="max-w-sm text-sm text-muted">{text}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Admin page heading with optional actions on the right. */
export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[1.75rem] leading-tight text-primary">{title}</h1>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
