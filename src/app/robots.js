import { siteUrl } from "@/lib/env";
import { getSetting } from "@/lib/site-data";

/**
 * robots.txt. Search engines may read the public site; never the admin, the APIs or the document
 * download links (Phase 28). AI training crawlers are asked to stay away when the owner turns that on
 * in Settings -> SEO (todo 10). The full SEO version with the sitemap comes in Phase 31.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "PerplexityBot",
  "Bytespider",
  "Meta-ExternalAgent",
  "Amazonbot",
  "cohere-ai",
];

export default async function robots() {
  const seo = await getSetting("seo");
  const rules = [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/d/"] }];
  if (seo?.blockAiCrawlers) rules.push({ userAgent: AI_CRAWLERS, disallow: "/" });
  return { rules, host: siteUrl() };
}
