import { enquiryScope } from "@/lib/admin/enquiries";
import { requireAdmin } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
import { likeTerm } from "@/lib/security/like";

const TAKE = 5;
const like = (q) => ({ contains: likeTerm(q), mode: "insensitive" });

/**
 * GET /api/admin/search?q= — global admin search (Phase 16 todo 02). Each group is searched only when
 * the user may read it, so results never reveal what a role cannot open. Prisma escapes the query.
 */
export const GET = route(async (req) => {
  const user = await requireAdmin();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return json({ ok: true, groups: [] });
  const live = { deletedAt: null };
  const enquiryWhere = can(user, "read", "enquiries") ? await enquiryScope(user) : {};

  const jobs = [
    can(user, "read", "products") &&
      db.product
        .findMany({
          where: { ...live, OR: [{ name: like(q) }, { slug: like(q) }, { casNo: like(q) }] },
          take: TAKE,
          select: { id: true, name: true, casNo: true, status: true },
        })
        .then((r) => ({
          group: "Products",
          items: r.map((p) => ({
            title: p.name,
            meta: [p.casNo, p.status.toLowerCase()].filter(Boolean).join(" · "),
            href: `/admin/products/${p.id}`,
          })),
        })),
    can(user, "read", "categories") &&
      db.productCategory
        .findMany({
          where: { ...live, OR: [{ name: like(q) }, { slug: like(q) }] },
          take: TAKE,
          select: { id: true, name: true },
        })
        .then((r) => ({
          group: "Categories",
          items: r.map((c) => ({ title: c.name, meta: "", href: `/admin/categories/${c.id}` })),
        })),
    can(user, "read", "pages") &&
      db.page
        .findMany({
          where: { ...live, OR: [{ title: like(q) }, { slug: like(q) }] },
          take: TAKE,
          select: { id: true, title: true, slug: true },
        })
        .then((r) => ({
          group: "Pages",
          items: r.map((p) => ({ title: p.title, meta: p.slug, href: `/admin/pages/${p.id}` })),
        })),
    can(user, "read", "insights") &&
      db.post
        .findMany({
          where: { ...live, OR: [{ title: like(q) }, { slug: like(q) }] },
          take: TAKE,
          select: { id: true, title: true, status: true },
        })
        .then((r) => ({
          group: "Articles",
          items: r.map((p) => ({
            title: p.title,
            meta: p.status.toLowerCase(),
            href: `/admin/insights/${p.id}`,
          })),
        })),
    can(user, "read", "industries") &&
      db.industry
        .findMany({ where: { ...live, name: like(q) }, take: TAKE, select: { id: true, name: true } })
        .then((r) => ({
          group: "Industries",
          items: r.map((i) => ({ title: i.name, meta: "", href: `/admin/industries/${i.id}` })),
        })),
    can(user, "read", "enquiries") &&
      db.enquiry
        .findMany({
          where: {
            ...enquiryWhere,
            OR: [{ name: like(q) }, { company: like(q) }, { email: like(q) }, { phone: like(q) }],
          },
          orderBy: { createdAt: "desc" },
          take: TAKE,
          select: { id: true, name: true, company: true, type: true },
        })
        .then((r) => ({
          group: "Enquiries",
          items: r.map((e) => ({
            title: e.company ? `${e.name}, ${e.company}` : e.name,
            meta: e.type.toLowerCase(),
            href: `/admin/enquiries/${e.id}`,
          })),
        })),
    can(user, "read", "media") &&
      db.mediaAsset
        .findMany({
          where: { ...live, OR: [{ originalName: like(q) }, { alt: like(q) }] },
          take: TAKE,
          select: { id: true, originalName: true, alt: true, type: true },
        })
        .then((r) => ({
          group: "Media",
          items: r.map((m) => ({
            title: m.originalName || m.alt || "File",
            meta: m.type.toLowerCase(),
            href: `/admin/media?open=${m.id}`,
          })),
        })),
    can(user, "read", "users") &&
      db.adminUser
        .findMany({
          where: { OR: [{ name: like(q) }, { email: like(q) }] },
          take: TAKE,
          select: { id: true, name: true, email: true },
        })
        .then((r) => ({
          group: "Users",
          items: r.map((u) => ({ title: u.name || u.email, meta: u.email, href: "/admin/users" })),
        })),
  ].filter(Boolean);

  const groups = (await Promise.all(jobs)).filter((g) => g.items.length);
  return json({ ok: true, groups });
});
