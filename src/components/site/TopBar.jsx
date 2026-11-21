import { Clock, Mail, Phone, Receipt } from "lucide-react";

/**
 * Thin strip above the header (Phase 9 todo 01). Every item can be hidden from Admin > Settings > Top bar.
 * On phones only the phone number and the message stay visible.
 */
export function TopBar({ chrome }) {
  const { topbar, business, contact } = chrome;
  if (!topbar.enabled) return null;
  const item = "inline-flex items-center gap-1.5 whitespace-nowrap";
  return (
    <div className="bg-band text-[0.8125rem] text-band-ink/90" data-testid="topbar">
      <div className="container-site flex min-h-9 items-center justify-between gap-4 py-1.5">
        <p className="hidden truncate md:block">{topbar.message}</p>
        <ul className="flex w-full items-center justify-between gap-x-5 gap-y-1 md:w-auto md:justify-end">
          {topbar.showPhone && contact.phone ? (
            <li>
              <a href={contact.phoneHref} className={`${item} font-semibold text-band-ink hover:underline`}>
                <Phone aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                {contact.phone}
              </a>
            </li>
          ) : null}
          {topbar.showEmail && contact.email ? (
            <li className="hidden sm:block">
              <a href={`mailto:${contact.email}`} className={`${item} hover:underline`}>
                <Mail aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                {contact.email}
              </a>
            </li>
          ) : null}
          {topbar.showHours && business.hours ? (
            <li className="hidden lg:block">
              <span className={item}>
                <Clock aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                {business.hours}
              </span>
            </li>
          ) : null}
          {topbar.showGst && business.gst ? (
            <li className="hidden xl:block">
              <span className={`${item} font-data text-[0.75rem]`}>
                <Receipt aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                GSTIN {business.gst}
              </span>
            </li>
          ) : null}
          {topbar.message ? <li className="truncate md:hidden">{topbar.message}</li> : null}
        </ul>
      </div>
    </div>
  );
}
