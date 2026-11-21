import { Suspense } from "react";

import { getSiteChrome } from "@/lib/site-chrome";

import { ConsentGate } from "./ConsentGate";
import { FloatingContact } from "./FloatingContact";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { RevealObserver } from "./RevealObserver";
import { TopBar } from "./TopBar";

/**
 * Public page frame: skip link, top bar, header, main, footer, floating contact, cookie banner.
 * Pages render their sections only; <main id="main"> is provided here (one per page).
 */
export async function SiteShell({ children }) {
  const chrome = await getSiteChrome();
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[80] rounded-btn bg-primary px-4 py-2.5 font-semibold text-primary-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <TopBar chrome={chrome} />
      <Header chrome={chrome} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer chrome={chrome} />
      <FloatingContact chrome={chrome} />
      <RevealObserver />
      {chrome.analyticsEnabled ? (
        <Suspense fallback={null}>
          <ConsentGate />
        </Suspense>
      ) : null}
    </>
  );
}
