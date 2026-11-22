import { ArrowRight, FileSearch } from "lucide-react";
import Link from "next/link";

import { SearchLauncher } from "@/components/site/SearchLauncher";
import { Button } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Layout";
import { IconBox } from "@/components/ui/Static";
import { getMenu } from "@/lib/site-data";

/** 404 body: search plus the product families (Phase 9 todo 17). Used inside and outside the site layout. */
export async function NotFoundContent() {
  const families = await getMenu("MEGA");
  return (
    <Section tone="surface">
      <Container className="flex flex-col gap-10">
        <div className="flex max-w-2xl flex-col items-start gap-5">
          <IconBox icon={FileSearch} size="lg" />
          <p className="text-eyebrow">
            <span aria-hidden="true" className="inline-block h-px w-6 bg-accent" />
            Error 404
          </p>
          <h1 className="text-display">This page is not here.</h1>
          <p className="text-lead">
            The link may be old or mistyped. Search for the product you need, or start from one of our product
            families below.
          </p>
          <SearchLauncher />
          <div className="flex flex-wrap gap-3">
            <Button href="/">Go to the home page</Button>
            <Button href="/contact" variant="secondary">
              Contact us
            </Button>
          </div>
        </div>
        {families.length ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-h3">Popular product families</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {families.map((f) => (
                <li key={f.id}>
                  <Link
                    href={f.href}
                    className="flex items-center justify-between gap-3 rounded-card border border-line bg-card px-5 py-4 font-semibold text-primary transition-colors hover:border-primary"
                  >
                    {f.label}
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>
    </Section>
  );
}
