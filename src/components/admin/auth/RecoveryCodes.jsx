"use client";

import { Copy, Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Static";

/** Shows the 10 recovery codes once, with copy and download. Codes live only in this component's memory. */
export function RecoveryCodes({ codes, onDone, doneLabel = "I have saved them, continue" }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = `Global India admin — recovery codes\nEach code works once. Keep them somewhere safe and offline.\n\n${codes.join("\n")}\n`;

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "global-india-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <Alert tone="info" title="Save these 10 recovery codes now">
        If your phone is lost, each code lets you sign in once. They will not be shown again.
      </Alert>
      <ol className="grid grid-cols-2 gap-2 surface-card bg-surface p-4 font-data text-[0.9375rem] tracking-wider">
        {codes.map((c) => (
          <li key={c} className="text-center">
            {c}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={download}>
          <Download aria-hidden="true" /> Download .txt
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Checkbox
        label="I have stored these codes somewhere safe"
        checked={saved}
        onChange={(e) => setSaved(e.target.checked)}
      />
      <Button size="lg" disabled={!saved} onClick={onDone}>
        {doneLabel}
      </Button>
    </div>
  );
}
