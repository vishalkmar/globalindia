import "./globals.css";

import { AnalyticsLoader } from "@/components/site/AnalyticsLoader";
import { ToastProvider } from "@/components/ui/Feedback";
import { siteUrl } from "@/lib/env";
import { fontVariables } from "@/lib/fonts";
import { getActiveTheme, getMedia, getSetting } from "@/lib/site-data";
import { isHexColor } from "@/lib/theme/contrast";
import { themeMode, themeToCss } from "@/lib/theme/css";

/**
 * Site-wide metadata from Admin > Settings > SEO (Phase 8 todo 16-17): title template, default
 * description, favicon, default share image, search-console verification tags.
 */
export async function generateMetadata() {
  const seo = await getSetting("seo");
  const [favicon, og] = await Promise.all([getMedia(seo.faviconId), getMedia(seo.ogImageId)]);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: seo.defaultTitle, template: seo.titleTemplate },
    description: seo.defaultDescription,
    applicationName: seo.siteName,
    icons: favicon ? { icon: [{ url: favicon.url }], apple: [{ url: favicon.url }] } : undefined,
    openGraph: {
      siteName: seo.siteName,
      type: "website",
      locale: "en_IN",
      images: og
        ? [{ url: og.url, width: og.width ?? undefined, height: og.height ?? undefined, alt: og.alt }]
        : undefined,
    },
    twitter: { card: og ? "summary_large_image" : "summary" },
    verification: {
      google: seo.googleVerification || undefined,
      other: seo.bingVerification ? { "msvalidate.01": seo.bingVerification } : undefined,
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout. The active Theme (Admin > Theme) is printed as CSS variables, so activating another
 * theme changes the whole site on the next request — no redeploy (Phase 8 todo 14, 20).
 */
export default async function RootLayout({ children }) {
  const [theme, analytics] = await Promise.all([getActiveTheme(), getSetting("analytics")]);
  return (
    <html lang="en-IN" className={fontVariables} data-theme={themeMode(theme)} suppressHydrationWarning>
      <head>
        {/* Safe: themeToCss only emits validated hex colours, whitelisted font variables and clamped numbers. */}
        <style id="gi-theme" dangerouslySetInnerHTML={{ __html: themeToCss(theme.tokens) }} />
        <meta
          name="theme-color"
          content={
            isHexColor(theme.tokens?.colors?.light?.primary) ? theme.tokens.colors.light.primary : "#0F3B3A"
          }
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        <AnalyticsLoader ga4Id={analytics.ga4Id} clarityId={analytics.clarityId} />
      </body>
    </html>
  );
}
