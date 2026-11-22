import { Suspense } from "react";

import { NewsletterResult } from "@/components/content/NewsletterForm";
import { Container, Section } from "@/components/ui/Layout";

export const metadata = { title: "Subscription", robots: { index: false } };

/** Result of opening the newsletter confirmation link (Phase 15 todo 17). */
export default function NewsletterConfirmed() {
  return (
    <Section tone="surface">
      <Container className="flex flex-col items-start gap-5">
        <Suspense fallback={<h1 className="text-display">Subscription</h1>}>
          <NewsletterResult />
        </Suspense>
      </Container>
    </Section>
  );
}
