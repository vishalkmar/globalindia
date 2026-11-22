import { CtaBand } from "@/components/sections/ContentSections";
import { SimpleHero } from "@/components/site/SimpleHero";
import { Container, Section } from "@/components/ui/Layout";
import { Accordion } from "@/components/ui/Tabs";
import { getFaqs } from "@/lib/content/data";
import { SECTIONS } from "@/lib/sections/registry";
import { jsonLd } from "@/lib/seo/jsonLd";
import { getSiteChrome } from "@/lib/site-chrome";
import { FAQ_TOPICS } from "@/lib/validation/content";

export const metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers on ordering, delivery, quality documents and payments from Global India, Burari Road, Delhi.",
  alternates: { canonical: "/faq" },
};

/** Global FAQ page grouped by topic (Phase 15 todo 08). Questions are managed in Admin > FAQ. */
export default async function FaqPage() {
  const [faqs, chrome] = await Promise.all([getFaqs(), getSiteChrome()]);
  const groups = FAQ_TOPICS.map((topic) => ({ topic, items: faqs.filter((f) => f.topic === topic) })).filter(
    (g) => g.items.length,
  );
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
  return (
    <>
      <SimpleHero
        crumbs={[{ label: "FAQ" }]}
        eyebrow="Questions"
        title="Answers to what buyers ask us most."
        intro="Ordering, delivery, documents and payments. If your question is not here, call us or send a message."
      />
      <Section>
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:gap-16">
          <nav aria-label="FAQ topics" className="lg:sticky lg:top-24 lg:self-start">
            <ul className="flex flex-wrap gap-2 lg:flex-col">
              {groups.map((g) => (
                <li key={g.topic}>
                  <a
                    href={`#faq-${g.topic.toLowerCase()}`}
                    className="inline-flex h-9 items-center rounded-btn px-3 text-sm font-semibold text-ink hover:bg-surface"
                  >
                    {g.topic}{" "}
                    <span className="ml-2 font-data text-[0.75rem] text-muted">{g.items.length}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-12">
            {groups.length ? (
              groups.map((g) => (
                <section
                  key={g.topic}
                  id={`faq-${g.topic.toLowerCase()}`}
                  aria-labelledby={`faq-${g.topic}-title`}
                  className="flex scroll-mt-28 flex-col gap-4"
                >
                  <h2 id={`faq-${g.topic}-title`} className="text-h3">
                    {g.topic}
                  </h2>
                  <Accordion
                    items={g.items.map((f) => ({ id: f.id, title: f.question, content: f.answer }))}
                  />
                </section>
              ))
            ) : (
              <p className="text-muted">Questions are being added. Call us in the meantime.</p>
            )}
          </div>
        </Container>
      </Section>
      <CtaBand data={SECTIONS.ctaBand.defaults} ctx={{ contact: chrome.contact }} />
      {faqs.length ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      ) : null}
    </>
  );
}
