import { Badge } from "@/components/ui/Card";

const TONES = { PUBLISHED: "success", DRAFT: "neutral", ARCHIVED: "accent" };
const LABELS = { PUBLISHED: "Published", DRAFT: "Draft", ARCHIVED: "Archived" };

export const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft (not on the website)" },
  { value: "PUBLISHED", label: "Published (live)" },
  { value: "ARCHIVED", label: "Archived (hidden, kept for records)" },
];

/** Draft / Published / Archived label used in catalogue tables and editors. */
export function StatusBadge({ status }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{LABELS[status] ?? status}</Badge>;
}
