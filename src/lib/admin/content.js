import "server-only";

import { assertMediaRefs, assertSlugFree, recordRedirects, retiredSlug } from "@/lib/admin/catalogue";
import { audit } from "@/lib/audit";
import { denyAccess } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { invalidate, TAGS } from "@/lib/cache";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { saveRevision } from "@/lib/revisions";
import { sanitizeRichText } from "@/lib/security/sanitize";

/* ---------------------------------------------------------------- industries */

export function industryEditorShape(i) {
  const content = i.content && typeof i.content === "object" ? i.content : {};
  return {
    name: i.name,
    slug: i.slug,
    icon: i.icon,
    summary: i.summary,
    content: { intro: content.intro ?? "", needs: Array.isArray(content.needs) ? content.needs : [] },
    faqs: Array.isArray(i.faqs) ? i.faqs : [],
    productIds: (i.products ?? []).map((p) => p.id),
    imageId: i.imageId,
    status: i.status,
    seo: { title: "", description: "", noindex: false, ...(i.seo ?? {}) },
  };
}

/** Create or update an industry (Phase 15). Links products, records a redirect on slug change. */
export async function saveIndustry({ user, before, data }) {
  if (
    (before?.status ?? "DRAFT") !== data.status &&
    (before?.status === "PUBLISHED" || data.status === "PUBLISHED") &&
    !can(user, "publish", "industries")
  ) {
    await denyAccess(user, { action: "publish", resource: "industries", message: "Only a publisher can change whether this industry page is live." });
  }
  await assertSlugFree("industry", data.slug, before?.id ?? null);
  await assertMediaRefs([{ path: "imageId", id: data.imageId, kind: "image" }]);
  const live = await db.product.count({ where: { id: { in: data.productIds }, deletedAt: null } });
  if (live !== data.productIds.length)
    throw new HttpError(400, "Please check the highlighted fields.", {
      body: { fields: { productIds: "Some products no longer exist." } },
    });

  const { productIds, ...columns } = data;
  let moved = false;
  const id = await db.$transaction(async (tx) => {
    let industryId;
    if (before) {
      await tx.industry.update({
        where: { id: before.id },
        data: { ...columns, products: { set: productIds.map((p) => ({ id: p })) } },
      });
      industryId = before.id;
      if (before.slug !== data.slug)
        moved = await recordRedirects(tx, [[`/industries/${before.slug}`, `/industries/${data.slug}`]]);
    } else {
      const last = await tx.industry.aggregate({ where: { deletedAt: null }, _max: { order: true } });
      industryId = (
        await tx.industry.create({
          data: {
            ...columns,
            order: (last._max.order ?? -1) + 1,
            products: { connect: productIds.map((p) => ({ id: p })) },
          },
        })
      ).id;
    }
    await saveRevision({ entity: "industry", entityId: industryId, data, authorId: user.id }, tx);
    return industryId;
  });
  invalidate(TAGS.industries, TAGS.products, ...(moved ? [TAGS.redirects] : []));
  await audit({
    actorId: user.id,
    action: before ? "industry.update" : "industry.create",
    entity: "Industry",
    entityId: id,
    diff: { name: data.name, status: data.status },
  });
  return id;
}

export async function deleteIndustry({ user, industry }) {
  await db.industry.update({
    where: { id: industry.id },
    data: {
      deletedAt: new Date(),
      status: "ARCHIVED",
      slug: retiredSlug(industry.slug, industry.id),
      products: { set: [] },
    },
  });
  invalidate(TAGS.industries, TAGS.products);
  await audit({
    actorId: user.id,
    action: "industry.delete",
    entity: "Industry",
    entityId: industry.id,
    diff: { name: industry.name },
  });
}

/* ---------------------------------------------------------------- posts */

export function postEditorShape(p) {
  const scheduled = p.publishedAt && new Date(p.publishedAt) > new Date();
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    body: p.body,
    category: p.category,
    coverId: p.coverId,
    status: p.status,
    publishAt: scheduled ? new Date(p.publishedAt).toISOString() : "", // the editor shows it in local time
    seo: { title: "", description: "", noindex: false, ...(p.seo ?? {}) },
  };
}

/**
 * When a post goes live: now, or at its scheduled time (publishedAt in the future keeps it hidden
 * until then; public reads filter on publishedAt <= now). Re-saving a live post keeps its date.
 */
function publishedAtFor(before, data) {
  if (data.status !== "PUBLISHED") return null;
  if (data.publishAt) return new Date(data.publishAt);
  if (before?.status === "PUBLISHED" && before.publishedAt && new Date(before.publishedAt) <= new Date())
    return before.publishedAt;
  return new Date();
}

export async function savePost({ user, before, data }) {
  if (
    (before?.status ?? "DRAFT") !== data.status &&
    (before?.status === "PUBLISHED" || data.status === "PUBLISHED") &&
    !can(user, "publish", "insights")
  ) {
    await denyAccess(user, { action: "publish", resource: "insights", message: "Only a publisher can publish or unpublish articles." });
  }
  await assertSlugFree("post", data.slug, before?.id ?? null);
  await assertMediaRefs([{ path: "coverId", id: data.coverId, kind: "image" }]);
  const { publishAt: _publishAt, ...rest } = data;
  const columns = {
    ...rest,
    body: sanitizeRichText(data.body),
    publishedAt: publishedAtFor(before, data),
    publishAt: data.publishAt ? new Date(data.publishAt) : null,
  };

  let moved = false;
  const id = await db.$transaction(async (tx) => {
    let postId;
    if (before) {
      await tx.post.update({ where: { id: before.id }, data: columns });
      postId = before.id;
      if (before.slug !== data.slug && before.status === "PUBLISHED")
        moved = await recordRedirects(tx, [[`/insights/${before.slug}`, `/insights/${data.slug}`]]);
    } else {
      postId = (await tx.post.create({ data: { ...columns, authorId: user.id } })).id;
    }
    await saveRevision(
      { entity: "post", entityId: postId, data: { ...data, body: columns.body }, authorId: user.id },
      tx,
    );
    return postId;
  });
  invalidate(
    TAGS.posts,
    TAGS.post(data.slug),
    ...(before ? [TAGS.post(before.slug)] : []),
    ...(moved ? [TAGS.redirects] : []),
  );
  await audit({
    actorId: user.id,
    action: before ? "post.update" : "post.create",
    entity: "Post",
    entityId: id,
    diff: {
      title: data.title,
      status: data.status,
      ...(data.publishAt ? { scheduledFor: data.publishAt } : {}),
    },
  });
  return id;
}

export async function deletePost({ user, post }) {
  await db.post.update({
    where: { id: post.id },
    data: { deletedAt: new Date(), status: "ARCHIVED", slug: retiredSlug(post.slug, post.id) },
  });
  invalidate(TAGS.posts, TAGS.post(post.slug));
  await audit({
    actorId: user.id,
    action: "post.delete",
    entity: "Post",
    entityId: post.id,
    diff: { title: post.title },
  });
}
