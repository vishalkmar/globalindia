import { Phone } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Layout";
import { getSetting } from "@/lib/site-data";

/**
 * Temporary home page until Phase 10 builds the full home. Already driven by admin settings
 * (business details, header button, SEO) and the live theme, so theme/settings changes can be seen here.
 */
export default async function HomePage() {
  const [business, header] = await Promise.all([getSetting("business"), getSetting("header")]);
  const phone = business.phones?.[0]?.number;
  return (
    <>
      <Section tone="surface">
        <Container className="flex max-w-3xl flex-col items-start gap-5">
          <Eyebrow>Chemical raw materials · {business.address.city} · Since {business.established}</Eyebrow>
          <h1 className="text-display" data-testid="home-title">
            {business.name}
          </h1>
          <p className="text-lead">{business.tagline}. The full website is being built; for quotes and orders please call or write to us.</p>
          <div className="flex flex-wrap gap-3">
            <Button href={header.ctaHref}>{header.ctaText}</Button>
            {phone ? (
              <Button variant="secondary" href={`tel:${phone.replace(/\s/g, "")}`} external={false}>
                <Phone aria-hidden="true" /> {phone}
              </Button>
            ) : null}
          </div>
        </Container>
      </Section>
    </>
  );
}
