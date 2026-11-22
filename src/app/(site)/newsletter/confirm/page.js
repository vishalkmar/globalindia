import { NewsletterConfirm } from "@/components/content/NewsletterForm";
import { Container, Section } from "@/components/ui/Layout";

export const metadata = { title: "Confirm subscription", robots: { index: false, follow: false } };

/** Opened from the confirmation email; the token stays in the #fragment and is read in the browser. */
export default function NewsletterConfirmPage() {
  return (
    <Section tone="surface">
      <Container className="flex flex-col items-start gap-5">
        <NewsletterConfirm />
      </Container>
    </Section>
  );
}
