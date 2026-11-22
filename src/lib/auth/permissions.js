/**
 * Role matrix (Phase 6 todo 02-03). Pure data + function — imported by the server guard AND by the
 * admin UI to hide buttons. Hiding is only cosmetic: every route handler calls requirePermission().
 *
 * Actions: read | create | update | delete | publish
 */

export const ROLES = ["VIEWER", "EDITOR", "SUPER_ADMIN"];

export const RESOURCES = {
  dashboard: "Dashboard",
  pages: "Pages and sections",
  products: "Products",
  categories: "Categories",
  media: "Media library",
  enquiries: "Enquiries",
  insights: "Insights (blog)",
  industries: "Industries",
  menus: "Menus",
  theme: "Theme",
  siteSettings: "Header, footer, top bar",
  business: "Business details",
  seo: "SEO and redirects",
  users: "Users",
  audit: "Audit log",
  security: "Security settings and limits",
};

const ALL = ["read", "create", "update", "delete", "publish"];
const CONTENT = [
  "pages",
  "products",
  "categories",
  "media",
  "enquiries",
  "insights",
  "industries",
  "menus",
  "siteSettings",
  "seo",
];

/** @type {Record<string, Record<string, string[]>>} */
export const MATRIX = {
  VIEWER: {
    dashboard: ["read"],
    ...Object.fromEntries(CONTENT.map((r) => [r, ["read"]])),
    theme: ["read"],
    business: ["read"],
  },
  EDITOR: {
    dashboard: ["read"],
    ...Object.fromEntries(CONTENT.map((r) => [r, ALL])),
    theme: ["read", "create", "update"], // can prepare themes, only SUPER_ADMIN publishes
    business: ["read"],
  },
  SUPER_ADMIN: Object.fromEntries(Object.keys(RESOURCES).map((r) => [r, ALL])),
};

/**
 * @param {{ role: string } | null | undefined} user
 * @param {"read"|"create"|"update"|"delete"|"publish"} action
 * @param {keyof typeof RESOURCES} resource
 */
export function can(user, action, resource) {
  if (!user || !MATRIX[user.role]) return false;
  return (MATRIX[user.role][resource] ?? []).includes(action);
}

/** Markdown table of the matrix (used to keep docs in sync). */
export function matrixMarkdown() {
  const head = `| Resource | ${ROLES.join(" | ")} |\n|---|${ROLES.map(() => "---").join("|")}|`;
  const rows = Object.entries(RESOURCES).map(
    ([key, label]) =>
      `| ${label} | ${ROLES.map((r) => (MATRIX[r][key] ?? []).join(", ") || "none").join(" | ")} |`,
  );
  return [head, ...rows].join("\n");
}
