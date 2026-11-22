import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getPreviewPage, getPublishedPage } from "@/lib/pages";
import { isPreview } from "@/lib/preview";
import { normaliseSection } from "@/lib/sections/registry";
import { currentYear } from "@/lib/site-chrome";

import { PreviewBanner } from "./PreviewBanner";

async function Live({ slug, fallbackLayout }) {
  const [page, year] = await Promise.all([getPublishedPage(slug), currentYear()]);
  if (!page) {
    if (!fallbackLayout) notFound();
    // The page row is missing (fresh database): render the built-in default copy instead of a blank page.
    const sections = fallbackLayout.map((type, i) => ({ id: `default-${i}`, type, data: normaliseSection(type, null) }));
    return <SectionRenderer sections={sections} year={year} page={{ title: "Home", slug }} />;
  }
  return <SectionRenderer sections={page.sections} year={year} page={{ title: page.title, slug: page.slug }} />;
}

async function Preview({ slug, fallbackLayout }) {
  if (!(await isPreview())) return <Live slug={slug} fallbackLayout={fallbackLayout} />;
  const [page, year] = await Promise.all([getPreviewPage(slug), currentYear()]);
  if (!page) notFound();
  return (
    <>
      <PreviewBanner isDraft={page.isDraft} />
      <SectionRenderer sections={page.sections} year={year} page={{ title: page.title, slug: page.slug }} />
    </>
  );
}

/**
 * A page built from admin-managed sections. Visitors get the published, cached version. When draft
 * mode is on AND the request has an admin session, the unpublished draft is shown with a banner.
 */
export async function ManagedPage({ slug, fallbackLayout = null }) {
  const { isEnabled } = await draftMode();
  if (isEnabled) {
    return (
      <Suspense fallback={null}>
        <Preview slug={slug} fallbackLayout={fallbackLayout} />
      </Suspense>
    );
  }
  return <Live slug={slug} fallbackLayout={fallbackLayout} />;
}

/** Page metadata from the page's SEO fields (falls back to site defaults). */
export async function managedMetadata(slug, canonical) {
  const page = await getPublishedPage(slug);
  const seo = page?.seo ?? {};
  return {
    ...(seo.title ? { title: { absolute: seo.title } } : {}),
    ...(seo.description ? { description: seo.description } : {}),
    alternates: { canonical },
    ...(seo.noindex ? { robots: { index: false } } : {}),
  };
}
