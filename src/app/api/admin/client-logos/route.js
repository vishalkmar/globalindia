import { getCollection, putCollection } from "@/lib/admin/collections";
import { route } from "@/lib/http";

/** GET/PUT /api/admin/client-logos — the whole ordered list (see lib/admin/collections.js). */
export const GET = route(async () => getCollection("clientLogos"));
export const PUT = route(async (req) => putCollection("clientLogos", req));
