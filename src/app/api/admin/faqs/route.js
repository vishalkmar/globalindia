import { getCollection, putCollection } from "@/lib/admin/collections";
import { route } from "@/lib/http";

/** GET/PUT /api/admin/faqs — the whole ordered list (see lib/admin/collections.js). */
export const GET = route(async () => getCollection("faqs"));
export const PUT = route(async (req) => putCollection("faqs", req));
