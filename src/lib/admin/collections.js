import "server-only";

import { assertMediaRefs } from "@/lib/admin/catalogue";
import { audit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { assertSameOrigin, json, readJson } from "@/lib/http";
import { clientLogoListSchema, faqListSchema, testimonialListSchema } from "@/lib/validation/content";

/**
 * Simple ordered lists edited as a whole in the admin (Phase 15 todos 08, 14, 15): FAQs, testimonials,
 * client logos. Each save replaces the list in one transaction (order = array order), clears the
 * public cache and is audited.
 */
export const COLLECTIONS = {
  faqs: {
    resource: "pages",
    schema: faqListSchema,
    tags: [TAGS.faqs],
    entity: "Faq",
    load: () =>
      db.faq.findMany({
        orderBy: { order: "asc" },
        select: { question: true, answer: true, topic: true, isVisible: true },
      }),
    write: (tx, items) => tx.faq.createMany({ data: items.map((f, order) => ({ ...f, order })) }),
    clear: (tx) => tx.faq.deleteMany({}),
  },
  testimonials: {
    resource: "pages",
    schema: testimonialListSchema,
    tags: [TAGS.testimonials],
    entity: "Testimonial",
    load: () =>
      db.testimonial.findMany({
        orderBy: { order: "asc" },
        select: { quote: true, name: true, role: true, company: true, city: true, isVisible: true },
      }),
    write: (tx, items) => tx.testimonial.createMany({ data: items.map((t, order) => ({ ...t, order })) }),
    clear: (tx) => tx.testimonial.deleteMany({}),
  },
  clientLogos: {
    resource: "media",
    schema: clientLogoListSchema,
    tags: [TAGS.clientLogos],
    entity: "ClientLogo",
    load: async () =>
      (
        await db.clientLogo.findMany({
          orderBy: { order: "asc" },
          select: { name: true, mediaId: true, url: true, isVisible: true },
        })
      ).map((l) => ({ ...l, url: l.url ?? "" })),
    check: (items) =>
      assertMediaRefs(items.map((l, i) => ({ path: `items.${i}.mediaId`, id: l.mediaId, kind: "image" }))),
    write: (tx, items) =>
      tx.clientLogo.createMany({ data: items.map((l, order) => ({ ...l, url: l.url || null, order })) }),
    clear: (tx) => tx.clientLogo.deleteMany({}),
  },
};

/** GET handler body: the whole list. */
export async function getCollection(name) {
  const c = COLLECTIONS[name];
  await requirePermission("read", c.resource);
  return json({ ok: true, items: await c.load() });
}

/** PUT handler body: replace the whole list. */
export async function putCollection(name, req) {
  assertSameOrigin(req);
  const c = COLLECTIONS[name];
  const user = await requirePermission("update", c.resource);
  const { items } = await readJson(req, c.schema, { maxBytes: 256 * 1024 });
  if (c.check) await c.check(items);
  await db.$transaction(async (tx) => {
    await c.clear(tx);
    if (items.length) await c.write(tx, items);
  });
  invalidate(...c.tags);
  await audit({
    actorId: user.id,
    action: `${c.entity.toLowerCase()}.update`,
    entity: c.entity,
    entityId: "list",
    diff: { count: items.length },
  });
  return json({ ok: true, items: await c.load() });
}
