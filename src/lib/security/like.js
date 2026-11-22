/**
 * Prisma's `contains` is a SQL LIKE: % and _ inside the search text would act as wildcards (a lone "%"
 * matches every row). Escape them (and the escape character) so the text is matched literally
 * (Phase 17 todo 06). PostgreSQL's default LIKE escape character is the backslash.
 */
export const likeTerm = (q) => String(q).replace(/[\%_]/g, (c) => `\${c}`);
