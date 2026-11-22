import { siteUrl } from "@/lib/env";
import { jsonLd } from "@/lib/seo/jsonLd";
import { organizationGraph } from "@/lib/seo/organization";
import { getSetting } from "@/lib/site-data";

/** Site-wide Organization + LocalBusiness JSON-LD from the admin settings (cached with them). */
export async function OrganizationJsonLd() {
  const [business, social, seo] = await Promise.all([getSetting("business"), getSetting("social"), getSetting("seo")]);
  const graph = organizationGraph({ business, social, seo, url: siteUrl() });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(graph) }} />;
}
