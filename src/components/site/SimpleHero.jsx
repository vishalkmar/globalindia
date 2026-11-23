import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Eyebrow } from "@/components/ui/Card";
import { Container } from "@/components/ui/Layout";

/** Page header for fixed routes (industries, insights, FAQ): breadcrumb, eyebrow, H1, intro. */
export function SimpleHero({ crumbs, eyebrow, title, intro, children }) {
  return (
    <section className="hero-backdrop relative isolate overflow-hidden bg-surface" aria-labelledby="page-title">
      <Container className="flex flex-col items-start gap-5 py-12 md:py-16">
        <Breadcrumb items={crumbs} />
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 id="page-title" className="measure text-display">
          {title}
        </h1>
        {intro ? <p className="measure text-lead">{intro}</p> : null}
        {children}
      </Container>
    </section>
  );
}
