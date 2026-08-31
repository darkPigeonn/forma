"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFormMetaAction } from "@/app/actions/forms";
import { ui } from "@/lib/ui-id";

type FormTitleEditorProps = {
  formId: string;
  title: string;
  description: string;
  selected?: boolean;
  onSelect?: () => void;
};

export function FormTitleEditor({
  formId,
  title: initialTitle,
  description: initialDescription,
  selected = true,
  onSelect,
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
  const [prevInitial, setPrevInitial] = useState({
    title: initialTitle,
    description: initialDescription,
  });

  if (
    initialTitle !== prevInitial.title ||
    initialDescription !== prevInitial.description
  ) {
    setPrevInitial({ title: initialTitle, description: initialDescription });
    setTitle(initialTitle);
    setDescription(initialDescription);
    if (initialDescription) setShowDescription(true);
  }

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
    <div
      className={`overflow-hidden rounded-lg border bg-bg-elevated transition ${
        selected
          ? "border-accent shadow-sm ring-1 ring-accent/20"
          : "border-border hover:border-ink-muted/40"
      }`}
      onClick={onSelect}
    >
      <div className="h-2.5 bg-accent" aria-hidden="true" />
      <div
        className={`relative space-y-3 p-6 ${
          selected ? "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-accent" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <label htmlFor={titleId} className="sr-only">
            {ui.formTitle}
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={onSelect}
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
            className="w-full min-w-0 border-0 border-b border-border bg-transparent pb-1 font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-ink outline-none placeholder:text-ink-muted focus:border-accent"
            maxLength={200}
            placeholder={ui.untitledForm}
          />
          <p className="shrink-0 pt-2 text-xs text-ink-muted" aria-live="polite">
            {saveHint}
          </p>
        </div>

        {showDescription || selected ? (
          <>
            <label htmlFor={descId} className="sr-only">
              {ui.description}
            </label>
            <textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={onSelect}
              onBlur={() => {
                if (description !== initialDescription) {
                  save({ description });
                }
              }}
              rows={2}
              className="w-full resize-y border-0 border-b border-transparent bg-transparent py-1 text-ink-muted outline-none placeholder:text-ink-muted/70 focus:border-border"
              placeholder={ui.descriptionPlaceholder}
              maxLength={5000}
            />
          </>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.();
              setShowDescription(true);
            }}
            className="text-sm font-medium text-accent hover:underline"
          >
            {ui.addDescription}
          </button>
        )}
      </div>
    </div>
  );
}
