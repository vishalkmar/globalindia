import { Clock, Mail, MapPin, MessageCircle, Phone, ReceiptText } from "lucide-react";
import { Suspense } from "react";

import { LazyEnquiryForms } from "@/components/enquiry/LazyEnquiryForms";
import { MapEmbed } from "@/components/enquiry/MapEmbed";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Eyebrow } from "@/components/ui/Card";
import { Container, Section } from "@/components/ui/Layout";
import { getCatalogue } from "@/lib/catalogue/data";
import { getSetting } from "@/lib/site-data";

export const metadata = {
  title: "Contact Us and Request a Quote",
  description:
    "Request a quote, a sample or a callback from Global India, Burari Road, Delhi. Call +91 80717 79152, Monday to Saturday, 10 am to 7 pm.",
  alternates: { canonical: "/contact" },
};

function Tile({ icon: Icon, title, children }) {
  return (
    <div className="flex gap-4 surface-card p-5">
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold tracking-wide text-muted uppercase">{title}</h2>
        <div className="text-ink">{children}</div>
      </div>
    </div>
  );
}

/** Contact page (Phase 14 todo 01): tiles from Business details, click-to-load map, the four forms. */
export default async function ContactPage() {
  const [business, catalogue] = await Promise.all([getSetting("business"), getCatalogue()]);
  const a = business.address;
  const address = [a.line1, a.line2, `${a.city} ${a.pin}`, a.state !== a.city ? a.state : "", a.country]
    .filter(Boolean)
    .join(", ");
  const products = catalogue.flatMap((c) =>
    c.products.map((p) => ({ slug: p.slug, name: p.name, category: c.name, packSizes: p.packSizes })),
  );
  const query = encodeURIComponent(`${business.name}, ${address}`);
  const embedUrl = business.mapUrl || `https://www.google.com/maps?q=${query}&output=embed`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const whatsapp = business.whatsapp ? `https://wa.me/${business.whatsapp.replace(/\D/g, "")}` : "";

  return (
    <>
      <section className="border-b border-line bg-surface" aria-labelledby="page-title">
        <Container className="flex flex-col items-start gap-5 py-12 md:py-16">
          <Breadcrumb items={[{ label: "Contact" }]} />
          <Eyebrow>Contact and quotes</Eyebrow>
          <h1 id="page-title" className="measure text-display">
            Tell us what you need. We reply the same working day.
          </h1>
          <p className="measure text-lead">
            Send the product, grade, quantity and delivery city and you will get a written quote with GST and
            freight shown separately. For anything urgent, call us.
          </p>
        </Container>
      </section>

      <Section>
        <Container className="grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-12">
          {/* Height reserved for the lazily loaded forms so nothing below jumps (CLS, Phase 31 todo 16). */}
          <div id="quote" className="min-h-[44.5rem] scroll-mt-28 md:min-h-[30.5rem]">
            <h2 className="sr-only">Enquiry forms</h2>
            <Suspense fallback={<p className="text-muted">Loading the form…</p>}>
              <LazyEnquiryForms products={products} />
            </Suspense>
          </div>
          <aside className="flex flex-col gap-3" aria-label="Contact details">
            {business.phones.length ? (
              <Tile icon={Phone} title="Call">
                <ul className="flex flex-col gap-1">
                  {business.phones.map((p) => (
                    <li key={p.number}>
                      <a
                        href={`tel:${p.number.replace(/[^\d+]/g, "")}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {p.number}
                      </a>{" "}
                      {p.label ? <span className="text-sm text-muted">({p.label})</span> : null}
                    </li>
                  ))}
                </ul>
              </Tile>
            ) : null}
            {whatsapp ? (
              <Tile icon={MessageCircle} title="WhatsApp">
                <a
                  href={whatsapp}
                  className="font-semibold text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Message us on WhatsApp
                </a>
              </Tile>
            ) : null}
            {business.emails.length ? (
              <Tile icon={Mail} title="Email">
                <ul className="flex flex-col gap-1">
                  {business.emails.map((e) => (
                    <li key={e.email}>
                      <a
                        href={`mailto:${e.email}`}
                        className="font-semibold break-all text-primary hover:underline"
                      >
                        {e.email}
                      </a>{" "}
                      {e.label ? <span className="text-sm text-muted">({e.label})</span> : null}
                    </li>
                  ))}
                </ul>
              </Tile>
            ) : null}
            <Tile icon={MapPin} title="Address">
              <address className="not-italic">{address}</address>
            </Tile>
            {business.hours ? (
              <Tile icon={Clock} title="Hours">
                {business.hours}
              </Tile>
            ) : null}
            {business.gst ? (
              <Tile icon={ReceiptText} title="GSTIN">
                <span className="font-data">{business.gst}</span>
              </Tile>
            ) : null}
          </aside>
        </Container>
      </Section>

      <Section tone="surface" aria-labelledby="map-title">
        <Container className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div className="flex flex-col gap-3">
            <Eyebrow>Visit or collect</Eyebrow>
            <h2 id="map-title" className="text-h2">
              Burari Road, North Delhi.
            </h2>
            <p className="text-muted">
              Collecting material yourself? Call ahead so the order is packed and the invoice is ready when
              you arrive.
            </p>
          </div>
          <MapEmbed embedUrl={embedUrl} openUrl={openUrl} address={address} />
          {business.googleBusinessUrl ? (
            <a
              href={business.googleBusinessUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start font-semibold text-primary underline underline-offset-4"
            >
              Our Google Business Profile: directions, photos and hours
            </a>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
