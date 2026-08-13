"use client";

import { useId } from "react";
import { createId } from "@paralleldrive/cuid2";
import { QUESTION_TYPES, type QuestionType } from "@/lib/form-constants";
import { applyQuestionType } from "@/domain/forms";
import {
  isChoiceQuestionType,
  type QuestionInput,
} from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";

type QuestionEditorProps = {
  question: QuestionInput;
  index: number;
  total: number;
  onChange: (question: QuestionInput) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: QuestionEditorProps) {
  const labelId = useId();
  const helpId = useId();
  const typeId = useId();
  const requiredId = useId();
  const questionNum = index + 1;

  const showOptions = isChoiceQuestionType(question.type);

  return (
    <article
      className="space-y-4 rounded-md border border-border bg-bg-elevated p-4 transition-[opacity,height] duration-150"
      aria-label={ui.questionN(questionNum)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {ui.questionN(questionNum)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm disabled:opacity-40"
            aria-label={ui.moveQuestionUp(questionNum)}
            title={ui.moveUp}
          >
            {ui.moveUp}
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index >= total - 1}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm disabled:opacity-40"
            aria-label={ui.moveQuestionDown(questionNum)}
            title={ui.moveDown}
          >
            {ui.moveDown}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={total <= 1}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-danger hover:border-danger disabled:opacity-40"
            aria-label={ui.deleteQuestionN(questionNum)}
            title={total <= 1 ? ui.keepOneQuestion : ui.deleteQuestion}
          >
            {ui.delete}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={labelId} className="text-sm font-medium">
            {ui.label}
          </label>
          <input
            id={labelId}
            value={question.label}
            onChange={(e) => onChange({ ...question, label: e.target.value })}
            className="min-h-11 rounded-md border border-border bg-bg px-3"
            maxLength={500}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={typeId} className="text-sm font-medium">
            {ui.type}
          </label>
          <select
            id={typeId}
            value={question.type}
            onChange={(e) =>
              onChange(
                applyQuestionType(question, e.target.value as QuestionType),
              )
            }
            className="min-h-11 rounded-md border border-border bg-bg px-3"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {ui.questionTypes[type]}
              </option>
            ))}
          </select>
          {question.type === "file_upload" ? (
            <p className="text-xs text-ink-muted">{ui.fileUploadHint}</p>
          ) : null}
        </div>

        <div className="flex items-end">
          <label
            htmlFor={requiredId}
            className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium"
          >
            <input
              id={requiredId}
              type="checkbox"
              checked={question.required}
              onChange={(e) =>
                onChange({ ...question, required: e.target.checked })
              }
              className="size-4 accent-[var(--color-accent)]"
            />
            {ui.required}
          </label>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor={helpId} className="text-sm font-medium">
            {ui.helpText}{" "}
            <span className="font-normal text-ink-muted">{ui.helpTextOptional}</span>
          </label>
          <input
            id={helpId}
            value={question.helpText ?? ""}
            onChange={(e) => onChange({ ...question, helpText: e.target.value })}
            className="min-h-11 rounded-md border border-border bg-bg px-3"
            maxLength={1000}
            placeholder={ui.helpPlaceholder}
          />
        </div>
      </div>

      {showOptions ? (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium">{ui.options}</p>
          <ul className="space-y-2">
            {(question.options?.choices ?? []).map((choice, choiceIndex) => (
              <li key={choice.id} className="flex gap-2">
                <input
                  aria-label={ui.optionN(choiceIndex + 1)}
                  value={choice.label}
                  onChange={(e) => {
                    const choices = [...(question.options?.choices ?? [])];
                    choices[choiceIndex] = {
                      ...choice,
                      label: e.target.value,
                    };
                    onChange({
                      ...question,
                      options: { choices },
                    });
                  }}
                  className="min-h-11 flex-1 rounded-md border border-border bg-bg px-3"
                  maxLength={200}
                />
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-danger disabled:opacity-40"
                  disabled={(question.options?.choices?.length ?? 0) <= 1}
                  aria-label={ui.removeOptionN(choiceIndex + 1)}
                  onClick={() => {
                    const choices = (question.options?.choices ?? []).filter(
                      (c) => c.id !== choice.id,
                    );
                    onChange({
                      ...question,
                      options: { choices },
                    });
                  }}
                >
                  {ui.remove}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted"
            onClick={() => {
              const choices = [
                ...(question.options?.choices ?? []),
                {
                  id: createId(),
                  label: ui.optionPrefix(
                    (question.options?.choices?.length ?? 0) + 1,
                  ),
                },
              ];
              onChange({ ...question, options: { choices } });
            }}
          >
            {ui.addOption}
          </button>
        </div>
      ) : null}
    </article>
  );
}
