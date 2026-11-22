import { notFound } from "next/navigation";

import { managedMetadata, ManagedPage } from "@/components/site/ManagedPage";
import { PAGE_SLUG, publishedPageSlugs } from "@/lib/pages";

/**
 * Admin-managed company pages: /about, /why-us, /quality, /gallery, /careers and any page added later
 * in Admin > Pages. Fixed routes (/products, /contact, ...) take priority over this one.
 *
 * ensureStatic = "navigation": a slug that was not prerendered waits for its full render instead of
 * streaming a fallback shell first, so an unknown or unpublished slug gets a real 404 status (no soft 404).
 */
export const ensureStatic = "navigation";
// Blocking on purpose (see above): published slugs are prerendered, so real navigations are instant anyway.
export const instant = false;

export async function generateStaticParams() {
  return (await publishedPageSlugs()).map((page) => ({ page }));
}

export async function generateMetadata({ params }) {
  const { page } = await params;
  if (!PAGE_SLUG.test(page) || page === "home") return {};
  return managedMetadata(page, `/${page}`);
}

export default async function CompanyPage({ params }) {
  const { page } = await params;
  if (!PAGE_SLUG.test(page) || page === "home") notFound();
  return <ManagedPage slug={page} />;
}
