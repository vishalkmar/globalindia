/**
 * Organization + LocalBusiness structured data (Phase 31 todos 05, 19), built only from the admin's
 * Business details, Social links and SEO settings, so the name, address and phone (NAP) match the
 * visible footer and contact page exactly. No ratings, prices or reviews are invented.
 */
export function organizationGraph({ business, social, seo, url }) {
  const a = business.address ?? {};
  const phones = (business.phones ?? []).map((p) => p.number).filter(Boolean);
  const emails = (business.emails ?? []).map((e) => e.email).filter(Boolean);
  const sameAs = [...Object.values(social ?? {}), business.googleBusinessUrl].filter((v) => typeof v === "string" && v.startsWith("https://"));
  const orgId = `${url}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: business.name,
        ...(business.legalName ? { legalName: business.legalName } : {}),
        url,
        ...(business.established ? { foundingDate: String(business.established) } : {}),
        ...(phones[0] ? { telephone: phones[0] } : {}),
        ...(emails[0] ? { email: emails[0] } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "LocalBusiness",
        "@id": `${url}/#business`,
        parentOrganization: { "@id": orgId },
        name: business.name,
        description: business.tagline || seo?.defaultDescription || undefined,
        url,
        ...(phones.length ? { telephone: phones[0] } : {}),
        ...(emails.length ? { email: emails[0] } : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: [a.line1, a.line2].filter(Boolean).join(", "),
          addressLocality: a.city,
          ...(a.state ? { addressRegion: a.state } : {}),
          ...(a.pin ? { postalCode: a.pin } : {}),
          addressCountry: "IN",
        },
        areaServed: [
          { "@type": "City", name: "Delhi" },
          { "@type": "AdministrativeArea", name: "Delhi NCR" },
          { "@type": "Country", name: "India" },
        ],
        ...(business.googleBusinessUrl ? { hasMap: business.googleBusinessUrl } : {}),
        ...(business.gst ? { taxID: business.gst } : {}),
      },
    ],
  };
}
