import "./insights.css";

import { Layers3, Phone, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

import { Breadcrumb } from "@/components/site/Breadcrumb";
import Link from "@/components/ui/SmartLink";
import { getPosts, POSTS_PER_PAGE } from "@/lib/content/data";
import { getSiteChrome } from "@/lib/site-chrome";

import { InsightsGrid, InsightsIndex } from "./InsightsIndex";
import { Pager } from "./PostList";

/** Insights list body shared by /insights and /insights/page/[n] (Phase 15 todo 04). */
export async function InsightsPage({ page = 1 }) {
  const [all, chrome] = await Promise.all([getPosts(), getSiteChrome()]);
  const pages = Math.max(1, Math.ceil(all.length / POSTS_PER_PAGE));
  const posts = all.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE);
  const categories = [...new Set(all.map((p) => p.category))];
  const quoteHref = chrome.header.ctaHref || "/contact#quote";
  return (
    <div className="gi-insights-page">
      <section className="gi-insights-hero" aria-labelledby="insights-title">
        <div className="gi-insights-hero-inner">
          <div className="gi-insights-hero-copy">
            <Breadcrumb
              items={
                page === 1
                  ? [{ label: "Insights" }]
                  : [{ label: "Insights", href: "/insights" }, { label: `Page ${page}` }]
              }
            />
            <p className="gi-insights-eyebrow">
              <span aria-hidden="true" />
              Insights
            </p>
            <h1 id="insights-title">Practical notes on buying chemical raw materials.</h1>
            <p className="gi-insights-intro">
              Grades, documents, prices and handling, written by the people who answer the phone at our sales
              desk. Buyer guidance, in simple and practical terms.
            </p>
          </div>
          <div
            className="gi-insights-collage"
            aria-label="Laboratory glassware, chemical storage tanks and stocked warehouse"
          >
            <div className="gi-insights-collage-lab">
              <Image
                src="/images/insights/lab.webp"
                alt="Clear laboratory glassware used for chemical raw materials"
                fill
                priority
                sizes="(max-width: 700px) 60vw, 36vw"
              />
            </div>
            <div className="gi-insights-collage-tanks">
              <Image
                src="/images/insights/tanks.webp"
                alt="Chemical storage tanks with yellow safety railings"
                fill
                priority
                sizes="(max-width: 700px) 35vw, 24vw"
              />
            </div>
            <div className="gi-insights-collage-warehouse">
              <Image
                src="/images/industries/warehouse.webp"
                alt="Blue chemical drums stored on warehouse racks"
                fill
                sizes="(max-width: 700px) 40vw, 28vw"
              />
            </div>
          </div>
        </div>
      </section>
      <section className="gi-insights-content" aria-label="Insights articles">
        {page === 1 ? (
          <Suspense
            fallback={
              <>
                <InsightsGrid posts={posts} categories={categories} />
                <Pager page={page} pages={pages} />
              </>
            }
          >
            <InsightsIndex posts={all} firstPage={posts} categories={categories} pages={pages} />
          </Suspense>
        ) : (
          <>
            <InsightsGrid posts={posts} categories={[]} />
            <Pager page={page} pages={pages} />
          </>
        )}
      </section>
      <section className="gi-insights-quote-section" aria-labelledby="insights-quote-title">
        <div className="gi-insights-quote">
          <Image
            src="/images/industries/warehouse.webp"
            alt="Stocked chemical warehouse ready for dispatch"
            fill
            sizes="(min-width: 1440px) 1400px, 100vw"
            className="gi-insights-quote-photo"
          />
          <div className="gi-insights-quote-body">
            <p className="gi-insights-eyebrow gi-insights-quote-eyebrow">
              <span aria-hidden="true" />
              Ready to order
            </p>
            <h2 id="insights-quote-title">
              Tell us the product, grade and quantity. We will reply with a written quote.
            </h2>
            <div className="gi-insights-quote-bottom">
              <ul className="gi-insights-promises" aria-label="Our supply service">
                <li>
                  <ShieldCheck aria-hidden="true" />
                  <span>
                    Right grade
                    <br />
                    for your use
                  </span>
                </li>
                <li>
                  <Layers3 aria-hidden="true" />
                  <span>
                    Consistent
                    <br />
                    quality &amp; documents
                  </span>
                </li>
                <li>
                  <Truck aria-hidden="true" />
                  <span>
                    Reliable supply
                    <br />
                    across India
                  </span>
                </li>
              </ul>
              <div className="gi-insights-quote-actions">
                <Link href={quoteHref} className="gi-insights-quote-button">
                  Request a quote
                </Link>
                {chrome.contact.phone ? (
                  <a href={chrome.contact.phoneHref} className="gi-insights-phone-button">
                    <Phone aria-hidden="true" />
                    {chrome.contact.phone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
