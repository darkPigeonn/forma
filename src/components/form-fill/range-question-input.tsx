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

function RangeScaleLabels({
  min,
  max,
  minLabel,
  maxLabel,
}: {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
      <span>{minLabel || min}</span>
      <span>{maxLabel || max}</span>
    </div>
  );
}

function RangeOptionButton({
  option,
  checked,
  disabled,
  required,
  inputId,
  name,
  questionId,
  isFirst,
  firstInputRef,
  onChange,
}: {
  option: number;
  checked: boolean;
  disabled: boolean;
  required: boolean;
  inputId: string;
  name?: string;
  questionId: string;
  isFirst: boolean;
  firstInputRef?: (element: HTMLInputElement | null) => void;
  onChange: (value: number) => void;
}) {
  return (
    <label
      htmlFor={inputId}
      className={`flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation select-none flex-col items-center justify-center rounded-md border text-base font-medium transition active:scale-95 ${
        checked
          ? "border-accent bg-accent text-white"
          : "border-border bg-bg-elevated text-ink hover:border-ink-muted"
      } ${disabled ? "cursor-not-allowed opacity-60 active:scale-100" : ""}`}
    >
      <input
        id={inputId}
        ref={isFirst ? firstInputRef : undefined}
        type="radio"
        name={name ?? questionId}
        value={option}
        checked={checked}
        disabled={disabled}
        required={required}
        className="sr-only"
        onChange={() => onChange(option)}
      />
      <span aria-hidden="true">{option}</span>
    </label>
  );
}

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
  const showLabels = Boolean(range.minLabel || range.maxLabel);
  const sliderId = `${name ?? question.id}-slider`;
  const sliderValue = selected ?? range.min;

  return (
    <fieldset
      className="space-y-3"
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    >
      <legend className="sr-only">{question.label}</legend>

      {showLabels ? (
        <RangeScaleLabels
          min={range.min}
          max={range.max}
          minLabel={range.minLabel}
          maxLabel={range.maxLabel}
        />
      ) : null}

      {/* Mobile: large thumb slider + prominent value */}
      <div className="space-y-3 sm:hidden">
        <output
          htmlFor={sliderId}
          className="block text-center text-3xl font-semibold tabular-nums text-ink"
          aria-live="polite"
        >
          {selected ?? "—"}
        </output>
        <input
          id={sliderId}
          ref={firstInputRef}
          type="range"
          min={range.min}
          max={range.max}
          step={1}
          value={sliderValue}
          disabled={disabled}
          aria-label={question.label}
          aria-valuemin={range.min}
          aria-valuemax={range.max}
          aria-valuenow={selected ?? undefined}
          className="forma-range w-full touch-manipulation"
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {!showLabels ? (
          <RangeScaleLabels
            min={range.min}
            max={range.max}
            minLabel=""
            maxLabel=""
          />
        ) : null}
      </div>

      {/* sm+: wrapped tap targets (≥44px), multiple rows when needed */}
      <div
        className="flex flex-wrap justify-center gap-2 max-sm:hidden"
        role="radiogroup"
        aria-label={question.label}
      >
        {values.map((option, index) => {
          const inputId = `${name ?? question.id}-${option}`;
          return (
            <RangeOptionButton
              key={option}
              option={option}
              checked={selected === option}
              disabled={disabled}
              required={required}
              inputId={inputId}
              name={name}
              questionId={question.id}
              isFirst={index === 0}
              firstInputRef={firstInputRef}
              onChange={onChange}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
