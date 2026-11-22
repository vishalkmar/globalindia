/** Public address of a managed page: "home" -> "/", "legal-privacy" -> "/legal/privacy", others -> "/<slug>". */
export function pagePublicPath(slug) {
  if (slug === "home") return "/";
  if (slug.startsWith("legal-")) return `/legal/${slug.slice(6)}`;
  return `/${slug}`;
}
