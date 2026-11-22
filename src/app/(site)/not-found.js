import { NotFoundContent } from "@/components/site/NotFoundContent";

export const metadata = { title: "Page not found", robots: { index: false } };

/**
 * 404 for notFound() thrown inside the public site (unknown or unpublished [page] slug, later products).
 * The (site) layout already provides the header and footer, so only the body renders here.
 */
export default function SiteNotFound() {
  return <NotFoundContent />;
}
