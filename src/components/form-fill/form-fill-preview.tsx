import type { QuestionInput } from "@/lib/validators/question";
import { isChoiceQuestionType } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";

type FormFillPreviewProps = {
  title: string;
  description?: string;
  questions: QuestionInput[];
  /** When true, fields are interactive look-alikes but not submitted */
  interactive?: boolean;
};

export function FormFillPreview({
  title,
  description,
  questions,
  interactive = false,
}: FormFillPreviewProps) {
  const sorted = [...questions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ink">
          {title || ui.untitledForm}
        </h2>
        {description ? (
          <p className="whitespace-pre-wrap text-ink-muted">{description}</p>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-ink-muted">{ui.addQuestionToPreview}</p>
      ) : (
        <div className="space-y-5">
          {sorted.map((question) => (
            <PreviewField
              key={question.id}
              question={question}
              interactive={interactive}
            />
          ))}
        </div>
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
  const common =
    "w-full rounded-md border border-border bg-bg-elevated px-3 text-ink disabled:cursor-not-allowed disabled:opacity-80";

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-ink">
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
        <p id={helpId} className="text-sm text-ink-muted">
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
              className="flex min-h-11 items-center gap-2 text-sm"
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
              className="flex min-h-11 items-center gap-2 text-sm"
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
      ) : question.type === "file_upload" ? (
        <div className="space-y-1">
          <input
            id={fieldId}
            type="file"
            disabled={!interactive}
            aria-describedby={question.helpText ? helpId : undefined}
            className="block w-full text-sm text-ink-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-border file:bg-bg file:px-3 file:text-sm file:font-medium file:text-ink"
          />
          <p className="text-xs text-ink-muted">{ui.fileUploadHint}</p>
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
  );
}
