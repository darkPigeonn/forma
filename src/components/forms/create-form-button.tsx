"use client";

import { useState, useTransition } from "react";
import { createFormAction } from "@/app/actions/forms";
import { ui } from "@/lib/ui-id";

export function CreateFormButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createFormAction();
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={onCreate}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? ui.creating : ui.newForm}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
