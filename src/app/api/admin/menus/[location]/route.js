import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, HttpError, json, readJson, route } from "@/lib/http";
import { saveRevision } from "@/lib/revisions";
import { LOCATION_KEYS, menuSchemaFor } from "@/lib/settings/menus";

async function location(ctx) {
  const { location: loc } = await ctx.params;
  if (!LOCATION_KEYS.includes(loc)) throw new HttpError(404);
  return loc;
}

async function tree(loc) {
  const items = await db.menuItem.findMany({ where: { location: loc }, orderBy: { order: "asc" } });
  const pick = (i) => ({ label: i.label, href: i.href, newTab: i.newTab, isVisible: i.isVisible });
  return items
    .filter((i) => !i.parentId)
    .map((p) => ({ ...pick(p), children: items.filter((c) => c.parentId === p.id).map(pick) }));
}

/** GET /api/admin/menus/:location — full tree including hidden items. */
export const GET = route(async (_req, ctx) => {
  const loc = await location(ctx);
  await requirePermission("read", "menus");
  return json({ ok: true, location: loc, items: await tree(loc) });
});

/**
 * PUT /api/admin/menus/:location { items } — saves the whole menu in one transaction
 * (order follows the array order). Links are validated: page paths, https, tel:, mailto: only.
 */
export const PUT = route(async (req, ctx) => {
  assertSameOrigin(req);
  const loc = await location(ctx);
  const user = await requirePermission("update", "menus");
  const { items } = await readJson(req, menuSchemaFor(loc), { maxBytes: 64 * 1024 });

  await db.$transaction(async (tx) => {
    await tx.menuItem.deleteMany({ where: { location: loc } });
    for (const [i, item] of items.entries()) {
      const parent = await tx.menuItem.create({
        data: {
          location: loc,
          label: item.label,
          href: item.href,
          newTab: item.newTab,
          isVisible: item.isVisible,
          order: i,
        },
      });
      for (const [j, c] of (item.children ?? []).entries()) {
        await tx.menuItem.create({
          data: {
            location: loc,
            parentId: parent.id,
            label: c.label,
            href: c.href,
            newTab: c.newTab,
            isVisible: c.isVisible,
            order: j,
          },
        });
      }
    }
    await saveRevision(
      { entity: "menu", entityId: loc.toLowerCase(), data: { items }, authorId: user.id },
      tx,
    );
  });

  invalidate(TAGS.menuAt(loc));
  await audit({
    actorId: user.id,
    action: "menu.update",
    entity: "MenuItem",
    entityId: loc,
    diff: { count: items.length },
  });
  return json({ ok: true, items: await tree(loc) });
});
