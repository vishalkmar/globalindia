import { ArrowUpRight, Clock, Mail, MapPin, Phone, Receipt } from "lucide-react";

import { FooterNewsletter } from "@/components/content/FooterNewsletter";
import Link from "@/components/ui/SmartLink";
import { currentYear } from "@/lib/site-chrome";

import { CookieSettingsButton } from "./CookieConsent";
import { SOCIAL } from "./icons";
import { Logo } from "./Logo";

function FooterLinks({ title, items }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[0.75rem] font-bold tracking-[0.14em] text-band-ink/60 uppercase">{title}</h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((i) => {
          const ext = i.newTab || /^https?:\/\//.test(i.href);
          return (
            <li key={i.id}>
              {ext ? (
                <a
                  href={i.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-band-ink/90 hover:text-band-ink hover:underline"
                >
                  {i.label} <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
              ) : (
                <Link href={i.href} className="text-band-ink/90 hover:text-band-ink hover:underline">
                  {i.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Footer (Phase 9 todo 09-13): about + social, quick links, product families, contact + GST,
 * bottom bar with automatic year and legal links. Content from Settings > Footer / Business and Menus.
 */
export async function Footer({ chrome }) {
  const { footer, business, contact, social, menus } = chrome;
  const year = await currentYear();
  const a = business.address;
  const socials = SOCIAL.filter((s) => social[s.key]);
  const iconLink =
    "inline-flex size-10 items-center justify-center rounded-btn border border-[color-mix(in_oklab,var(--c-band-ink)_25%,transparent)] text-band-ink/90 hover:border-band-ink hover:text-band-ink";

  return (
    <footer
      className="relative overflow-hidden bg-band bg-[radial-gradient(60%_80%_at_100%_0%,color-mix(in_oklab,var(--c-accent)_16%,transparent),transparent_70%),radial-gradient(50%_60%_at_0%_100%,color-mix(in_oklab,var(--c-band-ink)_6%,transparent),transparent_70%)] text-band-ink"
      data-testid="site-footer"
    >
      <div className="container-site grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-12">
        <div className="flex flex-col gap-5">
          <Logo chrome={chrome} onDark />
          {footer.aboutText ? (
            <p className="max-w-sm text-[0.9375rem] leading-relaxed text-band-ink/80">{footer.aboutText}</p>
          ) : null}
          {socials.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Social profiles">
              {socials.map(({ key, label, Icon }) => (
                <li key={key}>
                  <a
                    href={social[key]}
                    target="_blank"
                    rel="noopener noreferrer me"
                    aria-label={`${business.name} on ${label}`}
                    className={iconLink}
                  >
                    <Icon className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="max-w-sm pt-2">
            <FooterNewsletter />
          </div>
        </div>

        <FooterLinks title="Company" items={menus.quick} />
        <FooterLinks title="Products" items={menus.products} />

        <div className="flex flex-col gap-4">
          <h2 className="text-[0.75rem] font-bold tracking-[0.14em] text-band-ink/60 uppercase">Contact</h2>
          <address className="flex flex-col gap-3 text-[0.9375rem] text-band-ink/90 not-italic">
            <p className="flex gap-2.5">
              <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={1.5} />
              <span>
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city} {a.pin}
                {a.country ? `, ${a.country}` : ""}
              </span>
            </p>
            {business.phones.map((p) => (
              <p key={p.number} className="flex gap-2.5">
                <Phone aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={1.5} />
                <a href={`tel:${p.number.replace(/[^\d+]/g, "")}`} className="hover:underline">
                  {p.number}
                  {p.label ? <span className="text-band-ink/60"> ({p.label})</span> : null}
                </a>
              </p>
            ))}
            {contact.email ? (
              <p className="flex gap-2.5">
                <Mail aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={1.5} />
                <a href={`mailto:${contact.email}`} className="break-all hover:underline">
                  {contact.email}
                </a>
              </p>
            ) : null}
            {business.hours ? (
              <p className="flex gap-2.5">
                <Clock aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={1.5} />
                {business.hours}
              </p>
            ) : null}
            {footer.showGst && business.gst ? (
              <p className="flex gap-2.5">
                <Receipt aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={1.5} />
                <span className="font-data text-[0.8125rem]">GSTIN {business.gst}</span>
              </p>
            ) : null}
          </address>
        </div>
      </div>

      <div className="border-t border-[color-mix(in_oklab,var(--c-band-ink)_15%,transparent)]">
        <div className="container-site flex flex-col gap-3 py-5 text-[0.8125rem] text-band-ink/70 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {year} {footer.bottomText}
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {menus.legal.map((l) => (
              <li key={l.id}>
                <Link href={l.href} className="hover:text-band-ink hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
            {chrome.analyticsEnabled ? (
              <li>
                <CookieSettingsButton />
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  );
}
