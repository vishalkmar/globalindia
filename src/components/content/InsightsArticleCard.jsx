import { ArrowRight, CalendarDays } from "lucide-react";

import { MediaImage } from "@/components/ui/MediaImage";
import Link from "@/components/ui/SmartLink";

const covers = {
  "light-liquid-paraffin-grades": {
    url: "/images/insights/paraffin.webp",
    alt: "Blue drum labelled Light Liquid Paraffin (LLP)",
  },
  "how-to-read-a-coa": {
    url: "/images/insights/coa.webp",
    alt: "Certificate of Analysis with product, grade and batch details on a clipboard",
  },
  "labsa-90-vs-labsa-96": {
    url: "/images/insights/labsa.webp",
    alt: "Liquid poured into a beaker beside a LABSA 90% and 96% comparison card",
  },
};

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function InsightsArticleCard({ post }) {
  const cover = post.cover ??
    covers[post.slug] ?? { url: "/images/insights/lab.webp", alt: "Laboratory glassware" };
  return (
    <article className="gi-insights-card">
      <div className="gi-insights-card-photo">
        <MediaImage
          asset={cover}
          aspect="3:2"
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
        />
      </div>
      <div className="gi-insights-card-body">
        <p className="gi-insights-category">{post.category}</p>
        <h2>
          <Link href={`/insights/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="gi-insights-excerpt">{post.excerpt}</p>
        <div className="gi-insights-card-footer">
          <time dateTime={new Date(post.publishedAt).toISOString()}>
            <CalendarDays aria-hidden="true" />
            {dateFormat.format(new Date(post.publishedAt))}
          </time>
          <span className="gi-insights-read" aria-hidden="true">
            Read article <ArrowRight />
          </span>
        </div>
      </div>
    </article>
  );
}
