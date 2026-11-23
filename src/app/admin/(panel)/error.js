"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { IconBox } from "@/components/ui/Static";

/**
 * Admin error boundary (Phase 6 todo 15). Shows no stack trace or framework detail;
 * the `digest` lets us find the matching server log line.
 */
export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error("admin.render_error", error?.digest ?? "");
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 surface-card p-8">
      <IconBox icon={TriangleAlert} />
      <h1 className="text-h3">This screen could not be loaded</h1>
      <p className="text-muted">
        Your data is safe. Try again, and if it keeps happening, share this reference with support.
      </p>
      {error?.digest ? (
        <code className="rounded border border-line bg-surface px-2 py-1 font-data text-sm">
          Ref {error.digest}
        </code>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={reset}>
          <RotateCcw aria-hidden="true" /> Try again
        </Button>
        <Button variant="ghost" href="/admin">
          Dashboard
        </Button>
      </div>
    </div>
  );
}
