import { getCollection, putCollection } from "@/lib/admin/collections";
import { route } from "@/lib/http";

/** GET/PUT /api/admin/testimonials — the whole ordered list (see lib/admin/collections.js). */
export const GET = route(async () => getCollection("testimonials"));
export const PUT = route(async (req) => putCollection("testimonials", req));
