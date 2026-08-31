"use client";

import { getRangeOptions, rangeValues } from "@/lib/range-question";
import type { QuestionInput } from "@/lib/validators/question";

type RangeQuestionInputProps = {
  question: QuestionInput;
  value: unknown;
  disabled?: boolean;
  name?: string;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
  onChange: (value: number) => void;
  firstInputRef?: (element: HTMLInputElement | null) => void;
};

export function RangeQuestionInput({
  question,
  value,
  disabled = false,
  name,
  describedBy,
  invalid = false,
  required = false,
  onChange,
  firstInputRef,
}: RangeQuestionInputProps) {
  const range = getRangeOptions(question);
  const values = rangeValues(range.min, range.max);
  const selected =
    typeof value === "number"
      ? value
      : value === "" || value === null || value === undefined
        ? null
        : Number(value);

  return (
    <fieldset
      className="space-y-3"
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    >
      <legend className="sr-only">{question.label}</legend>
      {(range.minLabel || range.maxLabel) && (
        <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
          <span>{range.minLabel || range.min}</span>
          <span>{range.maxLabel || range.max}</span>
        </div>
      )}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(values.length, 10)}, minmax(0, 1fr))`,
        }}
        role="radiogroup"
        aria-label={question.label}
      >
        {values.map((option, index) => {
          const checked = selected === option;
          const inputId = `${name ?? question.id}-${option}`;
          return (
            <label
              key={option}
              htmlFor={inputId}
              className={`flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-md border px-1 text-base font-medium transition ${
                checked
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-bg-elevated text-ink hover:border-ink-muted"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                id={inputId}
                ref={index === 0 ? firstInputRef : undefined}
                type="radio"
                name={name ?? question.id}
                value={option}
                checked={checked}
                disabled={disabled}
                required={required}
                className="sr-only"
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
