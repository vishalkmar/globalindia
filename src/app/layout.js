import "./globals.css";

export const metadata = {
  title: "Global India",
  description: "Chemical raw materials supplier, Delhi, since 2002.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
