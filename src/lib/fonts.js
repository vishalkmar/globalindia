import {
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Inter_Tight,
  JetBrains_Mono,
  Manrope,
  Newsreader,
  Source_Serif_4,
  Work_Sans,
} from "next/font/google";

/**
 * Every font in the theme whitelist (Design.md §3) is self-hosted by next/font.
 * Only the default trio is preloaded; the others download only if the active theme uses them.
 * The active theme maps --font-display / --font-body / --font-data to one of these variables.
 */

const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap", preload: false });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", preload: false });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", display: "swap", preload: false });
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
  preload: false,
});
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", display: "swap", preload: false });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
  preload: false,
});

/** All font CSS-variable classes; put on <html> once. */
export const fontVariables = [
  fraunces,
  manrope,
  jetbrainsMono,
  sourceSerif,
  newsreader,
  interTight,
  plexSans,
  workSans,
  plexMono,
]
  .map((f) => f.variable)
  .join(" ");
