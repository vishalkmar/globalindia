import { notFound } from "next/navigation";

import { managedMetadata, ManagedPage } from "@/components/site/ManagedPage";

/**
 * Legal and policy pages (Phase 15 todos 09-13): /legal/privacy, /legal/terms, /legal/cookies,
 * /legal/shipping, /legal/disclaimer. Each is the managed page "legal-<name>", edited in Admin > Pages.
 */
const LEGAL = ["privacy", "terms", "cookies", "shipping", "disclaimer"];

export const ensureStatic = "navigation";
export const instant = false;

export function generateStaticParams() {
  return LEGAL.map((page) => ({ page }));
}

export async function generateMetadata({ params }) {
  const { page } = await params;
  if (!LEGAL.includes(page)) return {};
  return managedMetadata(`legal-${page}`, `/legal/${page}`);
}

export default async function LegalPage({ params }) {
  const { page } = await params;
  if (!LEGAL.includes(page)) notFound();
  return <ManagedPage slug={`legal-${page}`} />;
}
