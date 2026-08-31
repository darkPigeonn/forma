"use client";

import { useState } from "react";
import { buildFormPages } from "@/domain/forms";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";
import { isChoiceQuestionType } from "@/lib/validators/question";
import { RangeQuestionInput } from "@/components/form-fill/range-question-input";
import { FormQuestionCard } from "@/components/form-fill/form-question-card";
import { formFillTypography } from "@/components/form-fill/form-fill-typography";
import { ui } from "@/lib/ui-id";

type FormFillPreviewProps = {
  title: string;
  description?: string;
  questions: QuestionInput[];
  sections?: SectionInput[];
  /** When true, fields are interactive look-alikes but not submitted */
  interactive?: boolean;
};

export function FormFillPreview({
  title,
  description,
  questions,
  sections,
  interactive = false,
}: FormFillPreviewProps) {
  const pages = buildFormPages(sections ?? [], questions, { skipEmpty: true });
  const multiPage = pages.length > 1;
  const [pageIndex, setPageIndex] = useState(0);
  const [submitNote, setSubmitNote] = useState(false);
  const safePageIndex = Math.min(pageIndex, Math.max(pages.length - 1, 0));

  const currentPage = pages[safePageIndex] ?? pages[0];
  const isLastPage = safePageIndex >= pages.length - 1;

  function goNext() {
    setSubmitNote(false);
    if (!isLastPage) {
      setPageIndex((index) => Math.min(index + 1, pages.length - 1));
      return;
    }
    setSubmitNote(true);
  }

  function goBack() {
    setSubmitNote(false);
    setPageIndex((index) => Math.max(index - 1, 0));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className={formFillTypography.title}>
          {title || ui.untitledForm}
        </h2>
        {safePageIndex === 0 && description ? (
          <p className={`whitespace-pre-wrap ${formFillTypography.lead}`}>
            {description}
          </p>
        ) : null}
      </div>

      {questions.length === 0 ? (
        <p className={formFillTypography.hint}>{ui.addQuestionToPreview}</p>
      ) : (
        <>
          {multiPage ? (
            <div className="space-y-2">
              <p className={formFillTypography.meta}>
                {ui.pageOf(safePageIndex + 1, pages.length)}
              </p>
              <div
                role="progressbar"
                aria-label={ui.formProgress}
                aria-valuemin={1}
                aria-valuemax={pages.length}
                aria-valuenow={safePageIndex + 1}
                className="h-1.5 overflow-hidden rounded-full bg-border"
              >
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${((safePageIndex + 1) / pages.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {currentPage?.section.title || currentPage?.section.description ? (
            <div className="space-y-1">
              {currentPage.section.title ? (
                <h3 className={formFillTypography.sectionTitle}>
                  {currentPage.section.title}
                </h3>
              ) : null}
              {currentPage.section.description ? (
                <p className={`whitespace-pre-wrap ${formFillTypography.lead}`}>
                  {currentPage.section.description}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-4">
            {(currentPage?.questions ?? []).map((question) => (
              <PreviewField
                key={question.id}
                question={question}
                interactive={interactive}
              />
            ))}
          </div>

          {submitNote ? (
            <p className={formFillTypography.hint} role="status">
              {ui.previewSubmitNote}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {multiPage && safePageIndex > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className={`inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 ${formFillTypography.button} text-ink hover:border-ink-muted`}
              >
                {ui.previousPage}
              </button>
            ) : null}
            <button
              type="button"
              onClick={goNext}
              className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-accent px-5 ${formFillTypography.button} text-white hover:bg-accent-hover sm:flex-none sm:w-auto`}
            >
              {isLastPage ? ui.submit : ui.nextPage}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PreviewField({
  question,
  interactive,
}: {
  question: QuestionInput;
  interactive: boolean;
}) {
  const fieldId = `preview-${question.id}`;
  const helpId = `${fieldId}-help`;
  const [rangeValue, setRangeValue] = useState<number | null>(null);
  const common = `${formFillTypography.field} ${formFillTypography.fieldDisabled}`;

  return (
    <FormQuestionCard>
      <div className="space-y-2">
      <label
        htmlFor={question.type === "range" ? undefined : fieldId}
        className={formFillTypography.questionLabel}
      >
        {question.label || ui.untitledQuestion}
        {question.required ? (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
        {question.required ? (
          <span className="sr-only"> {ui.requiredMark}</span>
        ) : null}
      </label>
      {question.helpText ? (
        <p id={helpId} className={formFillTypography.questionHelp}>
          {question.helpText}
        </p>
      ) : null}

      {question.type === "long_text" ? (
        <textarea
          id={fieldId}
          rows={3}
          disabled={!interactive}
          readOnly={!interactive}
          aria-describedby={question.helpText ? helpId : undefined}
          className={`${common} py-2`}
          placeholder={ui.yourAnswer}
        />
      ) : question.type === "multiple_choice" ? (
        <fieldset className="space-y-2" disabled={!interactive}>
          <legend className="sr-only">{question.label}</legend>
          {(question.options?.choices ?? []).map((choice) => (
            <label
              key={choice.id}
              className={formFillTypography.choiceOption}
            >
              <input
                type="radio"
                name={fieldId}
                value={choice.id}
                disabled={!interactive}
                readOnly={!interactive}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </fieldset>
      ) : question.type === "checkboxes" ? (
        <fieldset className="space-y-2" disabled={!interactive}>
          <legend className="sr-only">{question.label}</legend>
          {(question.options?.choices ?? []).map((choice) => (
            <label
              key={choice.id}
              className={formFillTypography.choiceOption}
            >
              <input
                type="checkbox"
                value={choice.id}
                disabled={!interactive}
                readOnly={!interactive}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </fieldset>
      ) : question.type === "dropdown" ? (
        <select
          id={fieldId}
          disabled={!interactive}
          aria-describedby={question.helpText ? helpId : undefined}
          className={`${common} min-h-11`}
          defaultValue=""
        >
          <option value="" disabled>
            {ui.selectOption}
          </option>
          {(question.options?.choices ?? []).map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      ) : question.type === "range" ? (
        <RangeQuestionInput
          question={question}
          name={fieldId}
          describedBy={question.helpText ? helpId : undefined}
          disabled={!interactive}
          value={rangeValue}
          onChange={(value) => setRangeValue(value)}
        />
      ) : question.type === "file_upload" ? (
        <div className="space-y-1">
          <input
            id={fieldId}
            type="file"
            disabled={!interactive}
            aria-describedby={question.helpText ? helpId : undefined}
            className="block w-full text-base text-ink-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-bg-elevated file:px-3 file:text-base file:font-medium file:text-ink"
          />
          <p className={formFillTypography.hint}>{ui.fileUploadHint}</p>
        </div>
      ) : (
        <input
          id={fieldId}
          type={
            question.type === "email"
              ? "email"
              : question.type === "number"
                ? "number"
                : question.type === "date"
                  ? "date"
                  : "text"
          }
          disabled={!interactive}
          readOnly={!interactive}
          aria-describedby={question.helpText ? helpId : undefined}
          className={`${common} min-h-11`}
          placeholder={
            isChoiceQuestionType(question.type) ? undefined : ui.yourAnswer
          }
        />
      )}
      </div>
    </FormQuestionCard>
  );
}
