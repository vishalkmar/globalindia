"use client";

import { useSearchParams } from "next/navigation";

import Link from "@/components/ui/SmartLink";
import { cn } from "@/lib/utils";

import { PostCard } from "./PostList";

/**
 * Category filter for the insights list (Phase 15 todo 04). Filters are links (?category=) so they work
 * before hydration; the server HTML lists the page's posts for crawlers.
 */
export function InsightsIndex({ posts, firstPage, categories, basePath = "/insights" }) {
  const active = useSearchParams().get("category");
  // A topic shows every post in it; no topic shows the first page (the pager covers the rest).
  const shown = active ? posts.filter((p) => p.category === active) : firstPage;
  return <InsightsGrid posts={shown} categories={categories} active={active} basePath={basePath} />;
}

export function InsightsGrid({ posts, categories, active = null, basePath = "/insights" }) {
  return (
    <div className="flex flex-col gap-8">
      {categories.length > 1 ? (
        <div role="group" aria-label="Topics" className="flex flex-wrap gap-2">
          {[null, ...categories].map((c) => (
            <Link
              key={c ?? "all"}
              href={c ? `${basePath}?category=${encodeURIComponent(c)}` : basePath}
              scroll={false}
              aria-current={(c ?? null) === (active ?? null) ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-btn border px-3.5 text-sm font-semibold",
                (c ?? null) === (active ?? null)
                  ? "border-primary bg-primary text-primary-ink"
                  : "border-line bg-card text-ink hover:border-primary",
              )}
            >
              {c ?? "All topics"}
            </Link>
          ))}
        </div>
      ) : null}
      {posts.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">No articles in this topic yet.</p>
      )}
    </div>
  );
}
