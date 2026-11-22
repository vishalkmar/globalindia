import { exportProductsCsv } from "@/lib/admin/productCsv";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { route } from "@/lib/http";

/** GET /api/admin/products/export — every product as CSV (formula-safe cells, UTF-8 with BOM). */
export const GET = route(async () => {
  const user = await requirePermission("read", "products");
  const csv = await exportProductsCsv();
  await audit({ actorId: user.id, action: "product.export", entity: "Product", entityId: "csv" });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="global-india-products-${date}.csv"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
