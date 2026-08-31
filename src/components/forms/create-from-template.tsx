"use client";

import { useState, useTransition } from "react";
import { createFormFromTemplateAction } from "@/app/actions/forms";
import { FORM_TEMPLATES } from "@/lib/form-templates";
import { ui } from "@/lib/ui-id";

export function CreateFromTemplate() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onChange(templateId: string) {
    if (!templateId) return;
    setError(null);
    startTransition(async () => {
      const result = await createFormFromTemplateAction(templateId);
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <label className="sr-only" htmlFor="form-template">
        {ui.startFromTemplate}
      </label>
      <select
        id="form-template"
        disabled={pending}
        defaultValue=""
        onChange={(event) => {
          onChange(event.target.value);
          event.target.value = "";
        }}
        className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-sm"
      >
        <option value="" disabled>
          {pending ? ui.creating : ui.startFromTemplate}
        </option>
        {FORM_TEMPLATES.map((template) => (
          <option key={template.id} value={template.id}>
            {template.title}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
