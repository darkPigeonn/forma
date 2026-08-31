"use client";

import { useId, useState } from "react";
import { createId } from "@paralleldrive/cuid2";
import { QUESTION_TYPES, type QuestionType } from "@/lib/form-constants";
import { applyQuestionType } from "@/domain/forms";
import {
  isChoiceQuestionType,
  type QuestionInput,
} from "@/lib/validators/question";
import { RangeQuestionInput } from "@/components/form-fill/range-question-input";
import { getRangeOptions } from "@/lib/range-question";
import { ui } from "@/lib/ui-id";

type QuestionEditorProps = {
  question: QuestionInput;
  index: number;
  total: number;
  number?: number;
  selected?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  canDelete?: boolean;
  onSelect?: () => void;
  onChange: (question: QuestionInput) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function QuestionEditor({
  question,
  index,
  total,
  number,
  selected = true,
  canMoveUp,
  canMoveDown,
  canDelete,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: QuestionEditorProps) {
  const labelId = useId();
  const helpId = useId();
  const typeId = useId();
  const requiredId = useId();
  const questionNum = number ?? index + 1;
  const moveUpDisabled = !(canMoveUp ?? index > 0);
  const moveDownDisabled = !(canMoveDown ?? index < total - 1);
  const deleteDisabled = !(canDelete ?? total > 1);
  const showOptions = isChoiceQuestionType(question.type);
  const showRangeSettings = question.type === "range";
  const rangeOptions = getRangeOptions(question);
  const [rangePreviewValue, setRangePreviewValue] = useState<number | null>(
    null,
  );

  return (
    <article
      id={`question-card-${question.id}`}
      className={`relative overflow-hidden rounded-lg border bg-bg-elevated-elevated transition-[box-shadow,border-color] duration-150 ${
        selected
          ? "border-accent shadow-sm ring-1 ring-accent/20"
          : "cursor-pointer border-border hover:border-ink-muted/50"
      }`}
      aria-label={ui.questionN(questionNum)}
      aria-current={selected ? "true" : undefined}
      tabIndex={selected ? undefined : 0}
      onClick={() => {
        if (!selected) onSelect?.();
      }}
      onKeyDown={(event) => {
        if (selected) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.();
        }
      }}
    >
      {selected ? (
        <div
          className="absolute inset-y-0 left-0 w-1 bg-accent"
          aria-hidden="true"
        />
      ) : null}

      {selected ? (
        <div className="space-y-4 p-5 pl-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <label htmlFor={labelId} className="sr-only">
                {ui.label}
              </label>
              <input
                id={labelId}
                value={question.label}
                onChange={(e) =>
                  onChange({ ...question, label: e.target.value })
                }
                className="w-full border-0 border-b border-border bg-transparent py-2 text-lg outline-none focus:border-accent"
                maxLength={500}
                placeholder={ui.questionPrompt}
              />
            </div>
            <div className="sm:w-52">
              <label htmlFor={typeId} className="sr-only">
                {ui.type}
              </label>
              <select
                id={typeId}
                value={question.type}
                onChange={(e) =>
                  onChange(
                    applyQuestionType(
                      question,
                      e.target.value as QuestionType,
                    ),
                  )
                }
                className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm"
              >
                {QUESTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ui.questionTypes[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={helpId} className="sr-only">
              {ui.helpText}
            </label>
            <input
              id={helpId}
              value={question.helpText ?? ""}
              onChange={(e) =>
                onChange({ ...question, helpText: e.target.value })
              }
              className="w-full border-0 border-b border-transparent bg-transparent py-1 text-sm text-ink-muted outline-none placeholder:text-ink-muted/70 focus:border-border"
              maxLength={1000}
              placeholder={ui.helpPlaceholder}
            />
          </div>

          {question.type === "file_upload" ? (
            <p className="text-xs text-ink-muted">{ui.fileUploadHint}</p>
          ) : null}

          {showRangeSettings ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{ui.questionTypes.range}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">{ui.rangeMin}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={rangeOptions.min}
                    onChange={(e) => {
                      const min = Number(e.target.value);
                      onChange({
                        ...question,
                        options: {
                          range: {
                            ...rangeOptions,
                            min: Number.isFinite(min) ? Math.trunc(min) : 0,
                          },
                        },
                      });
                    }}
                    className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">{ui.rangeMax}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={rangeOptions.max}
                    onChange={(e) => {
                      const max = Number(e.target.value);
                      onChange({
                        ...question,
                        options: {
                          range: {
                            ...rangeOptions,
                            max: Number.isFinite(max) ? Math.trunc(max) : 1,
                          },
                        },
                      });
                    }}
                    className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">{ui.rangeMinLabel}</span>
                  <input
                    value={rangeOptions.minLabel}
                    onChange={(e) => {
                      onChange({
                        ...question,
                        options: {
                          range: {
                            ...rangeOptions,
                            minLabel: e.target.value,
                          },
                        },
                      });
                    }}
                    placeholder={ui.rangeMinLabelPlaceholder}
                    className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
                    maxLength={100}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="font-medium">{ui.rangeMaxLabel}</span>
                  <input
                    value={rangeOptions.maxLabel}
                    onChange={(e) => {
                      onChange({
                        ...question,
                        options: {
                          range: {
                            ...rangeOptions,
                            maxLabel: e.target.value,
                          },
                        },
                      });
                    }}
                    placeholder={ui.rangeMaxLabelPlaceholder}
                    className="min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3"
                    maxLength={100}
                  />
                </label>
              </div>
              <RangeQuestionBuilderPreview
                question={question}
                value={rangePreviewValue}
                onChange={setRangePreviewValue}
              />
            </div>
          ) : null}

          {showOptions ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{ui.options}</p>
              <ul className="space-y-2">
                {(question.options?.choices ?? []).map((choice, choiceIndex) => (
                  <li key={choice.id} className="flex items-center gap-2">
                    <span
                      className="size-4 shrink-0 rounded-full border border-border"
                      aria-hidden="true"
                    />
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
                      className="min-h-11 flex-1 border-0 border-b border-border bg-transparent px-1 outline-none focus:border-accent"
                      maxLength={200}
                    />
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-danger disabled:opacity-40"
                      disabled={(question.options?.choices?.length ?? 0) <= 1}
                      aria-label={ui.removeOptionN(choiceIndex + 1)}
                      onClick={() => {
                        const choices = (
                          question.options?.choices ?? []
                        ).filter((c) => c.id !== choice.id);
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
                className="inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline"
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
          ) : showRangeSettings ? null : (
            <DisabledAnswerPreview question={question} />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
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
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={moveUpDisabled}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-sm disabled:opacity-40 hover:bg-border/40"
                aria-label={ui.moveQuestionUp(questionNum)}
                title={ui.moveUp}
              >
                {ui.moveUp}
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={moveDownDisabled}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-sm disabled:opacity-40 hover:bg-border/40"
                aria-label={ui.moveQuestionDown(questionNum)}
                title={ui.moveDown}
              >
                {ui.moveDown}
              </button>
              {onDuplicate ? (
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-border/40"
                  aria-label={ui.duplicateQuestionN(questionNum)}
                  title={ui.duplicateQuestion}
                >
                  {ui.duplicateQuestion}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onDelete}
                disabled={deleteDisabled}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-danger hover:bg-border/40 disabled:opacity-40"
                aria-label={ui.deleteQuestionN(questionNum)}
                title={deleteDisabled ? ui.keepOneQuestion : ui.deleteQuestion}
              >
                {ui.delete}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-lg font-medium text-ink">
              {question.label || ui.untitledQuestion}
              {question.required ? (
                <span className="text-danger" aria-hidden="true">
                  {" "}
                  *
                </span>
              ) : null}
            </p>
            <p className="shrink-0 text-xs text-ink-muted">
              {ui.questionTypes[question.type]}
            </p>
          </div>
          {question.helpText ? (
            <p className="text-sm text-ink-muted">{question.helpText}</p>
          ) : null}
          <DisabledAnswerPreview question={question} />
        </div>
      )}
    </article>
  );
}

function RangeQuestionBuilderPreview({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: QuestionInput;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <RangeQuestionInput
        question={question}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}

function DisabledAnswerPreview({ question }: { question: QuestionInput }) {
  const fieldClass =
    "w-full rounded-md border border-border bg-bg-elevated px-3 text-ink-muted";

  if (question.type === "long_text") {
    return (
      <div className={`${fieldClass} min-h-16 py-2 text-sm`}>
        {ui.yourAnswer}
      </div>
    );
  }

  if (
    question.type === "multiple_choice" ||
    question.type === "checkboxes"
  ) {
    const mark =
      question.type === "multiple_choice" ? "rounded-full" : "rounded-sm";
    return (
      <ul className="space-y-2">
        {(question.options?.choices ?? []).map((choice) => (
          <li
            key={choice.id}
            className="flex min-h-8 items-center gap-2 text-sm text-ink"
          >
            <span
              className={`size-4 border border-border ${mark}`}
              aria-hidden="true"
            />
            {choice.label}
          </li>
        ))}
      </ul>
    );
  }

  if (question.type === "dropdown") {
    return (
      <div className={`${fieldClass} min-h-11 text-sm leading-[2.75rem]`}>
        {ui.selectOption}
      </div>
    );
  }

  if (question.type === "range") {
    return (
      <RangeQuestionBuilderPreview
        question={question}
        value={null}
        onChange={() => {}}
        disabled
      />
    );
  }

  if (question.type === "file_upload") {
    return (
      <p className="text-sm text-ink-muted">{ui.fileUploadHint}</p>
    );
  }

  return (
    <div className={`${fieldClass} min-h-11 text-sm leading-[2.75rem]`}>
      {ui.yourAnswer}
    </div>
  );
}
