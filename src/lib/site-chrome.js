import "server-only";

import { cacheLife } from "next/cache";

import { getMedia, getMenu, getSetting } from "@/lib/site-data";

/**
 * Everything the public top bar, header, mega menu and footer need, in one call (Phase 9 todo 19).
 * All values come from admin settings and menus — nothing is hard-coded in the components.
 */
export async function getSiteChrome() {
  const [
    business,
    topbar,
    header,
    footer,
    social,
    analytics,
    headerMenu,
    megaMenu,
    quickLinks,
    productLinks,
    legalLinks,
  ] = await Promise.all([
    getSetting("business"),
    getSetting("topbar"),
    getSetting("header"),
    getSetting("footer"),
    getSetting("social"),
    getSetting("analytics"),
    getMenu("HEADER"),
    getMenu("MEGA"),
    getMenu("FOOTER_QUICK"),
    getMenu("FOOTER_PRODUCTS"),
    getMenu("FOOTER_LEGAL"),
  ]);
  const [logoLight, logoDark] = await Promise.all([
    getMedia(header.logoLightId),
    getMedia(header.logoDarkId),
  ]);
  const phone = business.phones?.[0]?.number ?? "";
  const email = business.emails?.[0]?.email ?? "";
  return {
    business,
    topbar,
    header,
    footer,
    social,
    analyticsEnabled: Boolean(analytics.ga4Id || analytics.clarityId),
    menus: {
      header: headerMenu,
      mega: megaMenu,
      quick: quickLinks,
      products: productLinks,
      legal: legalLinks,
    },
    logo: { light: logoLight, dark: logoDark },
    contact: {
      phone,
      phoneHref: phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "",
      email,
      whatsappHref: business.whatsapp ? `https://wa.me/${business.whatsapp.replace(/\D/g, "")}` : "",
    },
  };
}

/** Current year for the copyright line, cached for a day (no request-time clock read in components). */
export async function currentYear() {
  "use cache";
  try {
    cacheLife("days");
  } catch {
    /* outside Next */
  }
  return new Date().getFullYear();
}
