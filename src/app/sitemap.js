import { sitemapEntries } from "@/lib/seo/sitemap";

/** /sitemap.xml — pages, categories, products, industries and articles, with image entries. */
export default async function sitemap() {
  return sitemapEntries();
}
