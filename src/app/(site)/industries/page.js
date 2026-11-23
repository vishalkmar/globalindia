import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CtaBand } from "@/components/sections/ContentSections";
import { SimpleHero } from "@/components/site/SimpleHero";
import { Container, Section } from "@/components/ui/Layout";
import { IconBox } from "@/components/ui/Static";
import { getIndustries } from "@/lib/content/data";
import { iconFor } from "@/lib/sections/icons";
import { SECTIONS } from "@/lib/sections/registry";
import { getSiteChrome } from "@/lib/site-chrome";

export const metadata = {
  title: "Industries We Supply",
  description:
    "Raw materials for food, cosmetics, pharma, detergents, soap, textile, auto care and laboratories, supplied from Delhi with COA and SDS.",
  alternates: { canonical: "/industries" },
};

/** Industries list (Phase 15 todo 01). */
export default async function IndustriesPage() {
  const [industries, chrome] = await Promise.all([getIndustries(), getSiteChrome()]);
  return (
    <>
      <SimpleHero
        crumbs={[{ label: "Industries" }]}
        eyebrow="Industries we serve"
        title="Raw materials for the way your industry works."
        intro="Each industry buys differently: food makers need food grade paperwork, detergent units need active matter they can count on, labs need small clean packs. Pick yours."
      />
      <Section>
        <Container>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((ind) => (
              <li key={ind.slug}>
                <Link
                  href={`/industries/${ind.slug}`}
                  className="lift group flex h-full flex-col gap-4 surface-card p-6 transition-colors "
                >
                  <IconBox icon={iconFor(ind.icon)} />
                  <span className="text-h3 group-hover:underline group-hover:underline-offset-4">
                    {ind.name}
                  </span>
                  <span className="flex-1 text-[0.9375rem] text-muted">{ind.summary}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {ind._count.products} products <ArrowRight aria-hidden="true" className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
      <CtaBand data={SECTIONS.ctaBand.defaults} ctx={{ contact: chrome.contact }} />
    </>
  );
}
