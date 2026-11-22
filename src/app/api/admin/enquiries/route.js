import { ENQUIRY_LIST_SELECT, enquiryListQuery, withRef } from "@/lib/admin/enquiries";
import { listResponse } from "@/lib/admin/listQuery";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";

/** GET /api/admin/enquiries — the inbox (Phase 14 todo 12). Spam is hidden unless asked for. */
export const GET = route(async (req) => {
  const user = await requirePermission("read", "enquiries");
  const params = new URL(req.url).searchParams;
  const q = enquiryListQuery(params, user.id);
  const where = params.get("status") ? q.where : { AND: [q.where, { status: { not: "SPAM" } }] };
  const [rows, total] = await Promise.all([
    db.enquiry.findMany({
      where,
      orderBy: q.orderBy,
      skip: q.skip,
      take: q.take,
      select: ENQUIRY_LIST_SELECT,
    }),
    db.enquiry.count({ where }),
  ]);
  return json(listResponse({ rows: rows.map(withRef), total, page: q.page, pageSize: q.pageSize }));
});
