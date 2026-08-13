"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFormAction,
  duplicateFormAction,
  updateFormMetaAction,
} from "@/app/actions/forms";
import type { FormDetail } from "@/db/queries/forms";
import { ui } from "@/lib/ui-id";

type FormSettingsProps = {
  form: FormDetail;
};

export function FormSettingsPanel({ form }: FormSettingsProps) {
  const router = useRouter();
  const confirmId = useId();
  const liveId = useId();

  const [confirmationMessage, setConfirmationMessage] = useState(
    form.confirmationMessage,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setConfirmationMessage(form.confirmationMessage);
  }, [form.confirmationMessage]);

  function saveConfirmation() {
    if (confirmationMessage === form.confirmationMessage) return;
    setError(null);
    setSaveState("saving");
    startTransition(async () => {
      const result = await updateFormMetaAction({
        formId: form.id,
        confirmationMessage,
      });
      if (!result.ok) {
        setError(result.error);
        setSaveState("idle");
        return;
      }
      setSaveState("saved");
      router.refresh();
      window.setTimeout(() => setSaveState("idle"), 1500);
    });
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-muted">{ui.settingsHint}</p>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="space-y-4" aria-labelledby="form-details-heading">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="form-details-heading"
            className="font-[family-name:var(--font-fraunces)] text-xl font-semibold"
          >
            {ui.afterSubmit}
          </h2>
          <p id={liveId} className="text-sm text-ink-muted" aria-live="polite">
            {saveState === "saving"
              ? ui.saving
              : saveState === "saved"
                ? ui.saved
                : null}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={confirmId} className="text-sm font-medium">
            {ui.confirmationMessage}
          </label>
          <textarea
            id={confirmId}
            value={confirmationMessage}
            onChange={(e) => setConfirmationMessage(e.target.value)}
            onBlur={saveConfirmation}
            rows={2}
            className="rounded-md border border-border bg-bg-elevated px-3 py-2"
            maxLength={1000}
          />
          <p className="text-xs text-ink-muted">{ui.confirmationHint}</p>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="form-actions-heading">
        <h2
          id="form-actions-heading"
          className="font-[family-name:var(--font-fraunces)] text-xl font-semibold"
        >
          {ui.moreActions}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:border-ink-muted disabled:opacity-60"
            onClick={() => {
              startTransition(async () => {
                const result = await duplicateFormAction({ formId: form.id });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                if (result.formId) {
                  router.push(`/forms/${result.formId}`);
                }
              });
            }}
          >
            {ui.duplicate}
          </button>
          <button
            type="button"
            disabled={isPending}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-danger hover:border-danger disabled:opacity-60"
            onClick={() => {
              if (!window.confirm(ui.deleteFormConfirm(form.title))) {
                return;
              }
              startTransition(async () => {
                const result = await deleteFormAction({ formId: form.id });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                router.push("/dashboard");
                router.refresh();
              });
            }}
          >
            {ui.deleteForm}
          </button>
        </div>
      </section>
    </div>
  );
}
