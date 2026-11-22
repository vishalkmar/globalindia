import { containsAny, enumFilter, listResponse, parseListQuery } from "@/lib/admin/listQuery";
import { requirePermission } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { FOLDER_VALUES } from "@/lib/media/constants";
import { serializeAsset } from "@/lib/media/service";

/** GET /api/admin/media?q=&type=IMAGE|PDF&folder=&missingAlt=1&page= — library listing (Phase 7 todo 10). */
export const GET = route(async (req) => {
  await requirePermission("read", "media");
  const q = parseListQuery(new URL(req.url).searchParams, {
    sortable: ["createdAt", "bytes", "originalName"],
    defaultSort: ["createdAt", "desc"],
    maxPageSize: 60,
    search: containsAny(["alt", "originalName"]),
    filters: {
      type: enumFilter("type", ["IMAGE", "PDF"]),
      folder: enumFilter("folder", FOLDER_VALUES),
      missingAlt: (v) => (v === "1" ? { type: "IMAGE", alt: "" } : null),
    },
  });
  const where = { AND: [q.where, { deletedAt: null }] };
  const [rows, total] = await Promise.all([
    db.mediaAsset.findMany({
      where,
      orderBy: q.orderBy,
      skip: q.skip,
      take: q.take,
      include: { uploadedBy: { select: { name: true, email: true } } },
    }),
    db.mediaAsset.count({ where }),
  ]);
  return json(listResponse({ rows: rows.map(serializeAsset), total, page: q.page, pageSize: q.pageSize }));
});
