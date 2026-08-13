"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFormMetaAction } from "@/app/actions/forms";
import { ui } from "@/lib/ui-id";

type FormTitleEditorProps = {
  formId: string;
  title: string;
  description: string;
};

export function FormTitleEditor({
  formId,
  title: initialTitle,
  description: initialDescription,
}: FormTitleEditorProps) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [showDescription, setShowDescription] = useState(
    Boolean(initialDescription),
  );
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription);
    if (initialDescription) setShowDescription(true);
  }, [initialTitle, initialDescription]);

  function save(next: { title?: string; description?: string }) {
    startTransition(async () => {
      setSaveHint(ui.saving);
      const result = await updateFormMetaAction({
        formId,
        title: next.title ?? title,
        description: next.description ?? description,
      });
      if (!result.ok) {
        setSaveHint(result.error);
        return;
      }
      setSaveHint(ui.saved);
      router.refresh();
      window.setTimeout(() => setSaveHint(null), 1200);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={titleId} className="sr-only">
          {ui.formTitle}
        </label>
        <input
          id={titleId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim() && title.trim() !== initialTitle) {
              save({ title: title.trim() });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-full min-w-0 flex-1 border-0 bg-transparent font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-ink outline-none placeholder:text-ink-muted focus-visible:ring-0"
          maxLength={200}
          placeholder={ui.untitledForm}
        />
        <p className="text-xs text-ink-muted" aria-live="polite">
          {saveHint}
        </p>
      </div>

      {showDescription ? (
        <>
          <label htmlFor={descId} className="sr-only">
            {ui.description}
          </label>
          <textarea
            id={descId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== initialDescription) {
                save({ description });
              }
            }}
            rows={2}
            className="w-full resize-y rounded-md border border-transparent bg-transparent px-0 py-1 text-ink-muted outline-none placeholder:text-ink-muted/70 focus:border-border focus:bg-bg-elevated focus:px-3"
            placeholder={ui.descriptionPlaceholder}
            maxLength={5000}
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowDescription(true)}
          className="text-sm font-medium text-accent hover:underline"
        >
          {ui.addDescription}
        </button>
      )}
    </div>
  );
}
