import "server-only";

import { containsAny, enumFilter, parseListQuery } from "@/lib/admin/listQuery";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { enquiryRef } from "@/lib/enquiries/submit";
import { normaliseSetting } from "@/lib/settings/schemas";
import { ENQUIRY_STATUSES, ENQUIRY_TYPES } from "@/lib/validation/enquiry";

/** YYYY-MM-DD that is a real calendar day (dates are read in India time). */
const validDay = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00+05:30`)) &&
  new Date(`${v}T12:00:00Z`).toISOString().startsWith(v);

/**
 * Which enquiries this admin may see (Phase 21 todo 07). With "assignedOnly" on, everyone below
 * SUPER_ADMIN is limited to enquiries assigned to them. Read straight from the database (not the
 * page cache): an access decision must never use a stale value. Use it in every enquiry query.
 * @returns {Promise<object>} a Prisma where fragment ({} = everything)
 */
export async function enquiryScope(user) {
  if (user.role === "SUPER_ADMIN") return {};
  const row = await db.siteSetting.findUnique({ where: { key: "enquiries" } });
  return normaliseSetting("enquiries", row?.value).assignedOnly ? { assignedToId: user.id } : {};
}

/** Admin inbox query (Phase 14 todo 12): search, type/status/assignee/date filters. */
export function enquiryListQuery(searchParams, userId) {
  return parseListQuery(searchParams, {
    sortable: ["createdAt", "name", "status", "type"],
    defaultSort: ["createdAt", "desc"],
    search: containsAny(["name", "company", "email", "phone", "city", "message"]),
    filters: {
      type: enumFilter("type", ENQUIRY_TYPES),
      status: (v) =>
        v === "OPEN"
          ? { status: { in: ["NEW", "IN_PROGRESS", "QUOTED"] } }
          : ENQUIRY_STATUSES.includes(v)
            ? { status: v }
            : null,
      assigned: (v) =>
        v === "me"
          ? { assignedToId: userId }
          : v === "none"
            ? { assignedToId: null }
            : /^c[a-z0-9]{20,32}$/.test(v)
              ? { assignedToId: v }
              : null,
      from: (v) => (validDay(v) ? { createdAt: { gte: new Date(`${v}T00:00:00+05:30`) } } : null),
      to: (v) => (validDay(v) ? { createdAt: { lte: new Date(`${v}T23:59:59.999+05:30`) } } : null),
    },
  });
}

export const ENQUIRY_LIST_SELECT = {
  id: true,
  type: true,
  status: true,
  name: true,
  company: true,
  email: true,
  phone: true,
  city: true,
  productNames: true,
  spamScore: true,
  createdAt: true,
  assignedTo: { select: { id: true, name: true, email: true } },
};

export const withRef = (e) => ({ ...e, reference: enquiryRef(e.id) });

/** CSV export of the filtered inbox (todo 14). Personal data: admins with read access only, audited. */
export async function exportEnquiriesCsv(where) {
  const rows = await db.enquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { assignedTo: { select: { name: true, email: true } } },
  });
  return toCsv(
    [
      "reference",
      "received",
      "type",
      "status",
      "name",
      "company",
      "email",
      "phone",
      "city",
      "products",
      "quantity",
      "pack_size",
      "message",
      "assigned_to",
      "source",
    ],
    rows.map((e) => ({
      reference: enquiryRef(e.id),
      received: e.createdAt.toISOString(),
      type: e.type,
      status: e.status,
      name: e.name,
      company: e.company,
      email: e.email,
      phone: e.phone,
      city: e.city,
      products: e.productNames.join(" | "),
      quantity: e.quantity,
      pack_size: e.packSize,
      message: e.message,
      assigned_to: e.assignedTo ? e.assignedTo.name || e.assignedTo.email : "",
      source: e.source,
    })),
  );
}
