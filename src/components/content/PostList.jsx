import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import Link from "next/link";

import { MediaImage } from "@/components/ui/MediaImage";
import { cn } from "@/lib/utils";

const fmt = (d) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(d));

export function PostCard({ post }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-card transition-colors hover:border-primary">
      <div className="aspect-[16/9] overflow-hidden border-b border-line bg-surface">
        {post.cover ? (
          <MediaImage
            asset={post.cover}
            aspect="16:9"
            sizes="(min-width: 1024px) 380px, 100vw"
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-end p-5">
            <Newspaper aria-hidden="true" className="size-7 text-primary/40" strokeWidth={1.25} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-[0.75rem] font-bold tracking-[0.08em] text-accent-text uppercase">
          {post.category}
        </p>
        <h3 className="text-h3 leading-snug">
          <Link href={`/insights/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        <p className="flex-1 text-[0.9375rem] text-muted">{post.excerpt}</p>
        <time dateTime={new Date(post.publishedAt).toISOString()} className="text-[0.8125rem] text-muted">
          {fmt(post.publishedAt)}
        </time>
      </div>
    </article>
  );
}

/** Pagination links (/insights, /insights/page/2 ...). */
export function Pager({ page, pages }) {
  if (pages <= 1) return null;
  const href = (n) => (n === 1 ? "/insights" : `/insights/page/${n}`);
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          rel="prev"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Newer
        </Link>
      ) : (
        <span />
      )}
      <ol className="flex gap-1">
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-btn text-sm font-semibold",
                n === page ? "bg-primary text-primary-ink" : "text-ink hover:bg-surface",
              )}
            >
              {n}
            </Link>
          </li>
        ))}
      </ol>
      {page < pages ? (
        <Link
          href={href(page + 1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          rel="next"
        >
          Older <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
