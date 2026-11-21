import { Phone } from "lucide-react";

import { WhatsAppIcon } from "./icons";

/**
 * Floating Call / WhatsApp buttons on phones (Phase 9 todo 14). Each can be switched off in
 * Admin > Settings > Header; WhatsApp needs a number in Business details. Theme colours only.
 */
export function FloatingContact({ chrome }) {
  const { header, contact } = chrome;
  const call = header.floatingCall && contact.phone;
  const wa = header.floatingWhatsApp && contact.whatsappHref;
  if (!call && !wa) return null;
  const btn = "inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-[0_10px_24px_-12px_rgb(0_0_0/0.5)]";
  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2 md:hidden" data-testid="floating-contact">
      {wa ? (
        <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className={`${btn} border border-line bg-card text-primary`} aria-label="Chat on WhatsApp">
          <WhatsAppIcon className="size-5" /> WhatsApp
        </a>
      ) : null}
      {call ? (
        <a href={contact.phoneHref} className={`${btn} bg-primary text-primary-ink`} aria-label={`Call ${contact.phone}`}>
          <Phone aria-hidden="true" className="size-5" strokeWidth={1.75} /> Call
        </a>
      ) : null}
    </div>
  );
}
