import { Clock } from "lucide-react";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/content/PostList";
import { CtaBand } from "@/components/sections/ContentSections";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Layout";
import { MediaImage } from "@/components/ui/MediaImage";
import { getPost, getPostSlugs } from "@/lib/content/data";
import { readingMinutes, withHeadingIds } from "@/lib/content/toc";
import { siteUrl } from "@/lib/env";
import { SECTIONS } from "@/lib/sections/registry";
import { sanitizeRichText } from "@/lib/security/sanitize";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getSiteChrome } from "@/lib/site-chrome";
import { SLUG_RE } from "@/lib/validation/catalogue";

/** Article page with table of contents (Phase 15 todo 06). */
export const ensureStatic = "navigation";
export const instant = false;

export async function generateStaticParams() {
  return (await getPostSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return {};
  const post = await getPost(slug);
  if (!post) return {};
  const seo = post.seo ?? {};
  return {
    title: seo.title ? { absolute: seo.title } : post.title,
    description: seo.description || post.excerpt,
    alternates: { canonical: `/insights/${post.slug}` },
    openGraph: {
      type: "article",
      publishedTime: new Date(post.publishedAt).toISOString(),
      ...(post.cover ? { images: [post.cover.url] } : {}),
    },
    ...(seo.noindex ? { robots: { index: false } } : {}),
  };
}

const fmt = (d) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(d));

export default async function PostPage({ params }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) notFound();
  const post = await getPost(slug);
  if (!post) notFound();
  const chrome = await getSiteChrome();
  const { html, toc } = withHeadingIds(sanitizeRichText(post.body));
  const minutes = readingMinutes(post.body);
  const base = siteUrl();
  const related = [
    ...post.related.filter((r) => r.category === post.category),
    ...post.related.filter((r) => r.category !== post.category),
  ].slice(0, 3);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    mainEntityOfPage: `${base}/insights/${post.slug}`,
    author: { "@type": "Organization", name: chrome.business.name },
    publisher: { "@type": "Organization", name: chrome.business.name },
    ...(post.cover ? { image: [post.cover.url] } : {}),
  };

  return (
    <>
      <section className="border-b border-line bg-surface" aria-labelledby="page-title">
        <Container className="flex flex-col items-start gap-5 py-12 md:py-16">
          <Breadcrumb items={[{ label: "Insights", href: "/insights" }, { label: post.title }]} />
          <Eyebrow>{post.category}</Eyebrow>
          <h1 id="page-title" className="measure text-display">
            {post.title}
          </h1>
          <p className="measure text-lead">{post.excerpt}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <time dateTime={new Date(post.publishedAt).toISOString()}>{fmt(post.publishedAt)}</time>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-4" /> {minutes} min read
            </span>
            {/* Articles speak for the company; admin account names are not published. */}
            <span>By the Global India sales desk</span>
          </p>
        </Container>
      </section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,3fr)] lg:gap-16">
          <article className="flex min-w-0 flex-col gap-8">
            {post.cover ? (
              <MediaImage
                asset={post.cover}
                aspect="16:9"
                priority
                sizes="(min-width: 1024px) 760px, 100vw"
                className="w-full rounded-card border border-line"
              />
            ) : null}
            {toc.length > 1 ? (
              <nav
                aria-label="In this article"
                className="rounded-card border border-line bg-surface p-5 lg:hidden"
              >
                <p className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">In this article</p>
                <TocList toc={toc} />
              </nav>
            ) : null}
            <div className="prose-site measure" dangerouslySetInnerHTML={{ __html: html }} />
          </article>
          {toc.length > 1 ? (
            <aside className="hidden lg:block">
              <nav aria-label="In this article (sidebar)" className="sticky top-24 flex flex-col gap-2">
                <p className="text-sm font-bold tracking-wide text-muted uppercase">In this article</p>
                <TocList toc={toc} />
              </nav>
            </aside>
          ) : null}
        </Container>
      </Section>

      {related.length ? (
        <Section tone="surface" aria-labelledby="related-title">
          <Container className="flex flex-col gap-8">
            <h2 id="related-title" className="text-h2">
              More to read
            </h2>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.id}>
                  <PostCard post={r} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <CtaBand data={SECTIONS.ctaBand.defaults} ctx={{ contact: chrome.contact }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    </>
  );
}

function TocList({ toc }) {
  return (
    <ol className="flex flex-col gap-1.5 text-[0.9375rem]">
      {toc.map((t) => (
        <li key={t.id} className={t.level === 3 ? "pl-4" : undefined}>
          <a
            href={`#${t.id}`}
            className="text-ink hover:text-primary hover:underline hover:underline-offset-4"
          >
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );
}
