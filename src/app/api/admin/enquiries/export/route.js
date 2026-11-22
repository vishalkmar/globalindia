import { enquiryListQuery, enquiryScope, exportEnquiriesCsv } from "@/lib/admin/enquiries";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { route } from "@/lib/http";

/** GET /api/admin/enquiries/export?…filters — CSV of the filtered inbox (todo 14). Audited: it holds personal data. */
export const GET = route(async (req) => {
  const user = await requirePermission("read", "enquiries");
  const params = new URL(req.url).searchParams;
  const q = enquiryListQuery(params, user.id);
  const scope = await enquiryScope(user);
  const where = { AND: [q.where, scope, params.get("status") ? {} : { status: { not: "SPAM" } }] };
  const csv = await exportEnquiriesCsv(where);
  await audit({
    actorId: user.id,
    action: "enquiry.export",
    entity: "Enquiry",
    entityId: "csv",
    diff: { filters: Object.fromEntries(params) },
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="global-india-enquiries-${date}.csv"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
