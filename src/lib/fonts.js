import { IBM_Plex_Sans, Inter_Tight, Plus_Jakarta_Sans, Work_Sans } from "next/font/google";

/**
 * Every font in the theme whitelist (Design.md §3) is self-hosted by next/font.
 * Owner's choice (UI phase): Plus Jakarta Sans for headings and text; no serif, no monospace.
 * Only Jakarta is preloaded; the others download only if a theme switches to them.
 */

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
  preload: false,
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
  preload: false,
});
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
  preload: false,
});

/** All font CSS-variable classes; put on <html> once. */
export const fontVariables = [jakarta, interTight, plexSans, workSans].map((f) => f.variable).join(" ");
