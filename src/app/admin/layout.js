export const metadata = {
  title: { default: "Admin", template: "%s | Global India admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

/** Every /admin route: never indexed, no referrer leaks (reset/confirm links carry tokens in the URL). */
export default function AdminRootLayout({ children }) {
  return children;
}
