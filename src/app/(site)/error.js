"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/Static";

/**
 * Public error page (Phase 9 todo 18). Header and footer stay in place; no technical details are
 * shown — only a reference code that matches the server log.
 */
export default function SiteError({ error, reset }) {
  useEffect(() => {
    console.error("site.render_error", error?.digest ?? "");
  }, [error]);

  return (
    <section className="bg-surface py-20">
      <div className="container-site flex max-w-2xl flex-col items-start gap-5">
        <IconBox icon={TriangleAlert} size="lg" />
        <h1 className="text-h2">Something went wrong on this page.</h1>
        <p className="text-lead">
          Please try again. If you were sending an enquiry, nothing was lost on our side until you see a
          confirmation.
        </p>
        {error?.digest ? <p className="font-data text-sm text-muted">Reference {error.digest}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" /> Try again
          </Button>
          <Button href="/" variant="secondary">
            Go to the home page
          </Button>
        </div>
      </div>
    </section>
  );
}
