import "server-only";

import { HttpError } from "@/lib/http";

/**
 * Parses list query-string params for admin tables (Phase 6 todo 05).
 * Security: sort fields and filters come from an allow-list only — user input never becomes
 * a Prisma field name or operator (ORM/operator injection guard, Phase 17).
 *
 * @param {URLSearchParams} params
 * @param {{
 *   sortable: string[],                      // allowed sort columns
 *   defaultSort: [string, "asc"|"desc"],
 *   filters?: Record<string, (value: string) => object | null>, // name -> Prisma where fragment
 *   search?: (q: string) => object,          // q -> Prisma where fragment
 *   maxPageSize?: number,
 * }} spec
 */
export function parseListQuery(params, spec) {
  const pageSize = clampInt(params.get("pageSize"), 1, spec.maxPageSize ?? 100, 20);
  const page = clampInt(params.get("page"), 1, 10_000, 1);

  const sortParam = params.get("sort");
  const sort = sortParam && spec.sortable.includes(sortParam) ? sortParam : spec.defaultSort[0];
  const dirParam = params.get("dir");
  const dir = dirParam === "asc" || dirParam === "desc" ? dirParam : spec.defaultSort[1];

  const and = [];
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  if (q && spec.search) and.push(spec.search(q));

  for (const [name, toWhere] of Object.entries(spec.filters ?? {})) {
    const value = params.get(name);
    if (value === null || value === "") continue;
    if (value.length > 100) throw new HttpError(400);
    const where = toWhere(value);
    if (where === null) throw new HttpError(400, "Invalid filter.");
    and.push(where);
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: sort.includes(".") ? nested(sort, dir) : { [sort]: dir },
    where: and.length ? { AND: and } : {},
    sort,
    dir,
    q,
  };
}

function nested(path, dir) {
  return path
    .split(".")
    .reverse()
    .reduce((acc, key) => ({ [key]: acc }), dir);
}

function clampInt(v, min, max, fallback) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** Helper for enum filters: only listed values are accepted. */
export const enumFilter = (field, values) => (v) => (values.includes(v) ? { [field]: v } : null);

/** Case-insensitive "contains" across fields. Prisma escapes the value; we only cap its length. */
export const containsAny = (fields) => (q) => ({ OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) });

/** Standard list response. */
export function listResponse({ rows, total, page, pageSize }) {
  return { ok: true, rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
