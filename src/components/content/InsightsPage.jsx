import { Suspense } from "react";

import { CtaBand } from "@/components/sections/ContentSections";
import { SimpleHero } from "@/components/site/SimpleHero";
import { Container, Section } from "@/components/ui/Layout";
import { getPosts, POSTS_PER_PAGE } from "@/lib/content/data";
import { SECTIONS } from "@/lib/sections/registry";
import { getSiteChrome } from "@/lib/site-chrome";

import { InsightsGrid, InsightsIndex } from "./InsightsIndex";
import { Pager } from "./PostList";

/** Insights list body shared by /insights and /insights/page/[n] (Phase 15 todo 04). */
export async function InsightsPage({ page = 1 }) {
  const [all, chrome] = await Promise.all([getPosts(), getSiteChrome()]);
  const pages = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  const posts = all.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  const categories = [...new Set(all.map((p) => p.category))];
  return (
    <>
      <SimpleHero
        crumbs={
          page === 1
            ? [{ label: "Insights" }]
            : [{ label: "Insights", href: "/insights" }, { label: `Page ${page}` }]
        }
        eyebrow="Insights"
        title="Practical notes on buying chemical raw materials."
        intro="Grades, documents, prices and handling, written by the people who answer the phone at our sales desk."
      />
      <Section>
        <Container className="flex flex-col gap-10">
          {page === 1 ? (
            <Suspense fallback={<InsightsGrid posts={posts} categories={categories} />}>
              <InsightsIndex posts={all} firstPage={posts} categories={categories} />
            </Suspense>
          ) : (
            <InsightsGrid posts={posts} categories={[]} />
          )}
          <Pager page={page} pages={pages} />
        </Container>
      </Section>
      <CtaBand data={SECTIONS.ctaBand.defaults} ctx={{ contact: chrome.contact }} />
    </>
  );
}
