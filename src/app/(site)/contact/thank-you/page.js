import { Suspense } from "react";

import { ThankYouBody } from "@/components/enquiry/ThankYou";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { Container, Section } from "@/components/ui/Layout";
import { getSiteChrome } from "@/lib/site-chrome";

export const metadata = {
  title: "Thank you",
  robots: { index: false },
  alternates: { canonical: "/contact/thank-you" },
};

/** Success page with next steps (Phase 14 todo 16). Type and reference come from the URL (client side). */
export default async function ThankYouPage() {
  const chrome = await getSiteChrome();
  return (
    <Section tone="surface">
      <Container className="flex flex-col items-start gap-6">
        <Breadcrumb items={[{ label: "Contact", href: "/contact" }, { label: "Thank you" }]} />
        <Suspense fallback={<h1 className="text-display">Thank you. We have your enquiry.</h1>}>
          <ThankYouBody phone={chrome.contact.phone} phoneHref={chrome.contact.phoneHref} />
        </Suspense>
      </Container>
    </Section>
  );
}
