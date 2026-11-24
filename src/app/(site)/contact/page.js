import "./contact.css";

import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone, ReceiptText, Truck, Zap } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";

import { LazyEnquiryForms } from "@/components/enquiry/LazyEnquiryForms";
import { MapEmbed } from "@/components/enquiry/MapEmbed";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Button } from "@/components/ui/Button";
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
    <div className="gi-contact-tile">
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
    c.products.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: c.name,
      packSizes: p.packSizes,
      grade: p.grade,
    })),
  );
  const query = encodeURIComponent(`${business.name}, ${address}`);
  const embedUrl = business.mapUrl || `https://www.google.com/maps?q=${query}&output=embed`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const whatsapp = business.whatsapp ? `https://wa.me/${business.whatsapp.replace(/\D/g, "")}` : "";
  const phone = business.phones[0]?.number;
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";

  return (
    <div className="gi-contact-page">
      <section className="gi-contact-hero" aria-labelledby="page-title">
        <div className="gi-contact-hero-photo">
          <Image
            src="/images/contact/warehouse.webp"
            alt="Blue chemical drums and white sacks stocked in a clean warehouse"
            fill
            priority
            sizes="(max-width: 700px) 100vw, 50vw"
          />
        </div>
        <div className="gi-contact-hero-inner">
          <div className="gi-contact-hero-copy">
            <Breadcrumb items={[{ label: "Contact" }]} />
            <p className="gi-contact-eyebrow">
              <span aria-hidden="true" />
              Contact and quotes
            </p>
            <h1 id="page-title">Tell us what you need. We reply the same working day.</h1>
            <p className="gi-contact-intro">
              Send the product, grade, quantity and delivery city and you will get a written quote with GST
              and freight shown separately. For anything urgent, call us.
            </p>
            <div className="gi-contact-hero-actions">
              <Button href="#quote" size="lg">
                Request a quote <ArrowRight aria-hidden="true" />
              </Button>
              {phone ? (
                <Button href={phoneHref} variant="secondary" size="lg">
                  <Phone aria-hidden="true" />
                  Call sales
                </Button>
              ) : null}
            </div>
            <ul className="gi-contact-benefits" aria-label="Our service">
              <li>
                <span>
                  <Zap aria-hidden="true" />
                </span>
                Same-day response
              </li>
              <li>
                <span>
                  <ReceiptText aria-hidden="true" />
                </span>
                GST invoice
              </li>
              <li>
                <span>
                  <Truck aria-hidden="true" />
                </span>
                Pan-India supply
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="gi-contact-enquiry" aria-label="Contact and enquiry forms">
        <div className="gi-contact-enquiry-grid">
          {/* Height reserved for the lazily loaded forms so nothing below jumps (CLS, Phase 31 todo 16). */}
          <div id="quote" className="gi-contact-form-wrap">
            <h2 className="sr-only">Enquiry forms</h2>
            <Suspense fallback={<p className="text-muted">Loading the form…</p>}>
              <LazyEnquiryForms products={products} />
            </Suspense>
          </div>
          <aside className="gi-contact-details" aria-label="Contact details">
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
        </div>
      </section>

      <section className="gi-contact-visit" aria-labelledby="map-title">
        <div className="gi-contact-visit-grid">
          <div className="gi-contact-visit-copy">
            <p className="gi-contact-eyebrow">
              <span aria-hidden="true" />
              Visit or collect
            </p>
            <h2 id="map-title">
              Burari Road,
              <br /> North Delhi.
            </h2>
            <p className="text-muted">
              Collecting material yourself? Call ahead so the order is packed and the invoice is ready when
              you arrive.
            </p>
          </div>
          <div className="gi-contact-map">
            <MapEmbed embedUrl={embedUrl} openUrl={openUrl} address={address} />
          </div>
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
        </div>
      </section>
    </div>
  );
}
