import "./globals.css";

import { ToastProvider } from "@/components/ui/Feedback";
import { fontVariables } from "@/lib/fonts";
import { themeMode, themeToCss } from "@/lib/theme/css";
import { DEFAULT_THEME } from "@/lib/theme/presets";

export const metadata = {
  title: { default: "Global India", template: "%s | Global India, Delhi" },
  description: "Chemical raw materials supplier in Delhi since 2002.",
};

export const viewport = {
  themeColor: "#0F3B3A",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout. The active theme becomes CSS variables in a <style> tag.
 * Phase 8 replaces DEFAULT_THEME with the active Theme row from the database (cached, tag "theme").
 */
export default function RootLayout({ children }) {
  const theme = { ...DEFAULT_THEME, mode: "LIGHT" };
  return (
    <html lang="en-IN" className={fontVariables} data-theme={themeMode(theme)} suppressHydrationWarning>
      <head>
        {/* Safe: themeToCss only emits validated hex colours, whitelisted font vars and clamped numbers. */}
        <style id="gi-theme" dangerouslySetInnerHTML={{ __html: themeToCss(theme.tokens) }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
