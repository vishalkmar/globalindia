import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";

/** GET /api/admin/enquiries/unread — count and the latest few NEW enquiries for the admin bell (todo 19). */
export const GET = route(async () => {
  await requirePermission("read", "enquiries");
  const where = { status: "NEW" };
  const [count, latest] = await Promise.all([
    db.enquiry.count({ where }),
    db.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, name: true, company: true, createdAt: true },
    }),
  ]);
  return json({ ok: true, count, latest });
});
