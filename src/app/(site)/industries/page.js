import "./industries.css";

import {
  ArrowRight,
  Bubbles,
  Car,
  FileText,
  FlaskConical,
  Headset,
  Layers3,
  Milk,
  Phone,
  Pill,
  ShieldCheck,
  SoapDispenserDroplet,
  Spool,
  Truck,
} from "lucide-react";
import Image from "next/image";

import Link from "@/components/ui/SmartLink";
import { getIndustries } from "@/lib/content/data";
import { iconFor } from "@/lib/sections/icons";
import { getSiteChrome } from "@/lib/site-chrome";
import { imageForText } from "@/lib/stockImages";

export const metadata = {
  title: "Industries We Supply",
  description:
    "Raw materials for food, cosmetics, pharma, detergents, soap, textile, auto care and laboratories, supplied from Delhi with COA and SDS.",
  alternates: { canonical: "/industries" },
};

const artwork = {
  "food-beverage": { image: "food", Icon: FlaskConical },
  "cosmetics-personal-care": { image: "cosmetics", Icon: SoapDispenserDroplet },
  pharmaceuticals: { image: "pharma", Icon: Pill },
  "detergents-home-care": { image: "cleaning", Icon: Milk },
  "soap-making": { image: "soap", Icon: Bubbles },
  "textile-industrial": { image: "textile", Icon: Spool },
  "automotive-care": { image: "automotive", Icon: Car },
  laboratories: { image: "laboratories", Icon: FlaskConical },
};

const benefits = [
  { Icon: Truck, label: "Pan-India Supply" },
  { Icon: ShieldCheck, label: "Consistent Quality" },
  { Icon: Layers3, label: "Wide Product Range" },
  { Icon: Headset, label: "Expert Support" },
];

export default async function IndustriesPage() {
  const [industries, chrome] = await Promise.all([getIndustries(), getSiteChrome()]);
  const quoteHref = chrome.header.ctaHref || "/contact#quote";
  return (
    <div className="gi-industries-page">
      <section className="gi-industries-hero" aria-labelledby="industries-title">
        <div className="gi-industries-heroRibbon" aria-hidden="true" />
        <div className="gi-industries-heroImage">
          <Image
            src="/images/industries/hero.webp"
            alt="Blue and golden liquid raw materials and white powder in laboratory glassware at a chemical plant"
            fill
            priority
            sizes="(max-width: 700px) 100vw, 60vw"
          />
        </div>
        <div className="gi-industries-heroInner">
          <div className="gi-industries-heroCopy">
            <p className="gi-industries-eyebrow">
              <span aria-hidden="true" />
              Industrial raw materials supplier
            </p>
            <h1 id="industries-title">
              Raw materials for
              <br className="gi-industries-desktopBreak" /> the way your
              <br className="gi-industries-desktopBreak" /> <span>industry works.</span>
            </h1>
            <p className="gi-industries-intro">
              Reliable supply of chemical raw materials, intermediates and industry-grade ingredients for
              diverse applications across India.
            </p>
            <div className="gi-industries-actions">
              <Link href={quoteHref} className="gi-industries-primaryButton">
                Request a quote <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#industries-list" className="gi-industries-outlineButton">
                <FileText aria-hidden="true" /> Explore Industries
              </a>
            </div>
          </div>
        </div>
      </section>
      <div className="gi-industries-benefitBand">
        <ul className="gi-industries-benefits" aria-label="Our supply service">
          {benefits.map(({ Icon, label }) => (
            <li key={label}>
              <Icon aria-hidden="true" strokeWidth={1.6} />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
      <section id="industries-list" className="gi-industries-industries" aria-labelledby="industries-heading">
        <h2 id="industries-heading" className="gi-industries-sectionHeading">
          Industries We Serve
        </h2>
        {industries.length ? (
          <ul className="gi-industries-grid">
            {industries.map((industry) => {
              const art = artwork[industry.slug];
              const Icon = art?.Icon ?? iconFor(industry.icon);
              const image =
                industry.image?.url ||
                (art ? `/images/industries/${art.image}.webp` : imageForText(industry.name).src);
              return (
                <li key={industry.slug}>
                  <Link href={`/industries/${industry.slug}`} className="gi-industries-card">
                    <div className="gi-industries-cardImage" aria-hidden="true">
                      <Image src={image} alt="" fill sizes="(max-width: 700px) 180px, 220px" />
                    </div>
                    <span className="gi-industries-iconBox">
                      <Icon aria-hidden="true" strokeWidth={1.6} />
                    </span>
                    <h3>{industry.name}</h3>
                    <p>{industry.summary}</p>
                    <span className="gi-industries-productCount">
                      {industry._count.products} {industry._count.products === 1 ? "product" : "products"}{" "}
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="gi-industries-empty">
            Tell us what you are making, and we will help you find the right raw materials.{" "}
            <Link href={quoteHref}>Request a quote</Link>.
          </p>
        )}
      </section>
      <section className="gi-industries-quoteSection" aria-labelledby="industries-quote-title">
        <div className="gi-industries-quoteBand">
          <div className="gi-industries-quoteImage">
            <Image
              src="/images/industries/warehouse.webp"
              alt="Chemical drums and IBC containers arranged on warehouse racks, ready for dispatch"
              fill
              sizes="(max-width: 700px) 100vw, 65vw"
            />
          </div>
          <div className="gi-industries-quoteRibbon" aria-hidden="true" />
          <div className="gi-industries-quoteCopy">
            <p className={`gi-industries-eyebrow gi-industries-quoteEyebrow`}>
              <span aria-hidden="true" />
              Ready to order
            </p>
            <h2 id="industries-quote-title">
              Tell us the product, grade and quantity. We will reply with a written quote.
            </h2>
            <p>Usually the same working day. Samples on request.</p>
          </div>
          <div className="gi-industries-quoteActions">
            <Link href={quoteHref} className="gi-industries-whiteButton">
              <FileText aria-hidden="true" /> Request a quote
            </Link>
            {chrome.contact.phone ? (
              <a href={chrome.contact.phoneHref} className="gi-industries-phoneButton">
                <Phone aria-hidden="true" />
                {chrome.contact.phone}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
