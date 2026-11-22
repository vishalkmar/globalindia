import { notFound, permanentRedirect } from "next/navigation";

import { InsightsPage } from "@/components/content/InsightsPage";
import { getPosts, POSTS_PER_PAGE } from "@/lib/content/data";

/** /insights/page/2 and on (Phase 15 todo 04). Page 1 lives at /insights. */
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  const pages = Math.max(2, Math.ceil((await getPosts()).length / POSTS_PER_PAGE));
  return Array.from({ length: pages - 1 }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({ params }) {
  const { n } = await params;
  return { title: `Insights, page ${n}`, alternates: { canonical: `/insights/page/${n}` } };
}

export default async function InsightsPaged({ params }) {
  const { n } = await params;
  if (!/^\d{1,3}$/.test(n)) notFound();
  const page = Number(n);
  if (page === 1) permanentRedirect("/insights");
  const pages = Math.ceil((await getPosts()).length / POSTS_PER_PAGE);
  if (page < 1 || page > pages) notFound();
  return <InsightsPage page={page} />;
}
