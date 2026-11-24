"use client";

import { useSearchParams } from "next/navigation";

import Link from "@/components/ui/SmartLink";

import { InsightsArticleCard } from "./InsightsArticleCard";
import { Pager } from "./PostList";

/**
 * Category filter for the insights list (Phase 15 todo 04). Filters are links (?category=) so they work
 * before hydration; the server HTML lists the page's posts for crawlers.
 */
export function InsightsIndex({ posts, firstPage, categories, pages = 1, basePath = "/insights" }) {
  const active = useSearchParams().get("category");
  // A topic shows every post in it; no topic shows the first page (the pager covers the rest).
  const shown = active ? posts.filter((p) => p.category === active) : firstPage;
  return (
    <>
      <InsightsGrid posts={shown} categories={categories} active={active} basePath={basePath} />
      {!active ? <Pager page={1} pages={pages} /> : null}
    </>
  );
}

export function InsightsGrid({ posts, categories, active = null, basePath = "/insights" }) {
  return (
    <div className="gi-insights-index">
      {categories.length > 1 ? (
        <div role="group" aria-label="Topics" className="gi-insights-topics">
          {[null, ...categories].map((c) => (
            <Link
              key={c ?? "all"}
              href={c ? `${basePath}?category=${encodeURIComponent(c)}` : basePath}
              scroll={false}
              aria-current={(c ?? null) === (active ?? null) ? "true" : undefined}
              className="gi-insights-topic"
            >
              {c ?? "All topics"}
            </Link>
          ))}
        </div>
      ) : null}
      {posts.length ? (
        <ul className="gi-insights-grid">
          {posts.map((p) => (
            <li key={p.id}>
              <InsightsArticleCard post={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="gi-insights-empty" role="status">
          No articles in this topic yet.
        </p>
      )}
    </div>
  );
}
