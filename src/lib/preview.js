import "server-only";

import { draftMode } from "next/headers";

import { getAdmin } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";

/**
 * Should this request see unpublished content? Both must be true:
 * 1. Next.js Draft Mode is on (signed bypass cookie, set only by POST /api/admin/preview), and
 * 2. the request carries a valid admin session with read access.
 * So a leaked draft cookie alone never exposes drafts (Phase 21 todo 08).
 */
export async function isPreview() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return false;
  const user = await getAdmin();
  return Boolean(user && can(user, "read", "pages"));
}
