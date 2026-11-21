"use client";

import { useState } from "react";

import { FormBuilder, useZodForm } from "@/components/admin/FormBuilder";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Static";
import { SECTIONS } from "@/lib/sections/registry";

function SectionForm({ section, onApply, onCancel, readOnly }) {
  const def = SECTIONS[section.type];
  const form = useZodForm(def.schema, section.data);
  const [error, setError] = useState("");

  function apply() {
    const v = form.validate();
    if (!v.ok) {
      setError("Please fix the highlighted fields.");
      return;
    }
    onApply(v.data);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">{def.description}</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <fieldset disabled={readOnly} className="flex flex-col gap-5">
        <FormBuilder form={form} fields={def.fields} columns={1} />
      </fieldset>
      <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-line bg-card px-5 py-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {!readOnly ? <Button onClick={apply}>Apply changes</Button> : null}
      </div>
    </div>
  );
}

/** Edit one section in a side drawer. "Apply" puts the changes into the page draft (saved with Save draft). */
export function SectionDrawer({ section, onApply, onClose, readOnly }) {
  return (
    <Drawer open={Boolean(section)} onClose={onClose} title={section ? `Edit: ${SECTIONS[section.type].label}` : ""} className="w-[min(640px,calc(100%-24px))]">
      {section ? <SectionForm key={section.key} section={section} onApply={onApply} onCancel={onClose} readOnly={readOnly} /> : null}
    </Drawer>
  );
}
