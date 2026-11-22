import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, json, route } from "@/lib/http";
import { resetRedirectMap } from "@/lib/redirectMap";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * POST /api/admin/cache — refresh everything the public site has cached (Phase 16 todo 09). Normally
 * not needed (every save refreshes what it changed); this is the "something looks stale" button.
 * Super admin only, rate limited, audited.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requirePermission("update", "security");
  const limited = await rateLimit("sensitiveUser", `cache:${user.id}`);
  if (!limited.success)
    return json({ ok: false, error: "Please wait a little before purging again." }, { status: 429 });
  const fixed = Object.values(TAGS).filter((t) => typeof t === "string");
  const [pages, products, categories, posts] = await Promise.all([
    db.page.findMany({ select: { slug: true } }),
    db.product.findMany({ select: { slug: true } }),
    db.productCategory.findMany({ select: { slug: true } }),
    db.post.findMany({ select: { slug: true } }),
  ]);
  const dynamic = [
    ...pages.map((p) => TAGS.page(p.slug)),
    ...products.map((p) => TAGS.product(p.slug)),
    ...categories.map((c) => TAGS.category(c.slug)),
    ...posts.map((p) => TAGS.post(p.slug)),
  ];
  invalidate(...fixed, ...dynamic);
  resetRedirectMap();
  await audit({
    actorId: user.id,
    action: "cache.purge",
    entity: "Cache",
    entityId: "all",
    diff: { tags: fixed.length + dynamic.length },
  });
  return json({ ok: true, tags: fixed.length + dynamic.length });
});
