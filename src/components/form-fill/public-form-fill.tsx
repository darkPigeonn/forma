"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { PublicFormView } from "@/db/queries/public-forms";
import type { AnswerValue, FileAnswerValue } from "@/domain/answers";
import { isChoiceQuestionType } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";

type PublicFormFillProps = {
  form: PublicFormView;
};

type FieldErrors = Record<string, string>;

export function PublicFormFill({ form }: PublicFormFillProps) {
  const questions = useMemo(
    () => [...form.questions].sort((a, b) => a.order - b.order),
    [form.questions],
  );

  const [values, setValues] = useState<Record<string, AnswerValue>>(() => {
    const initial: Record<string, AnswerValue> = {};
    for (const q of questions) {
      if (q.type === "checkboxes") initial[q.id] = [];
      else if (q.type === "file_upload") initial[q.id] = null;
      else initial[q.id] = "";
    }
    return initial;
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirmation, setConfirmation] = useState(form.confirmationMessage);
  const statusId = useId();
  const firstFieldRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (form.status !== "published" || done) return;
    firstFieldRef.current?.focus();
  }, [form.status, done]);

  function setValue(questionId: string, value: AnswerValue) {
    setValues((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function clientValidate(): FieldErrors {
    const next: FieldErrors = {};
    for (const q of questions) {
      const value = values[q.id];
      const blank =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === "object" &&
          !Array.isArray(value) &&
          "url" in value &&
          !value.url);

      if (q.required && blank) {
        next[q.id] = ui.thisRequired;
        continue;
      }
      if (blank) continue;

      if (q.type === "email" && typeof value === "string") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          next[q.id] = ui.validEmail;
        }
      }
      if (q.type === "number") {
        const num =
          typeof value === "number" ? value : Number(String(value).trim());
        if (!Number.isFinite(num)) {
          next[q.id] = ui.validNumber;
        }
      }
      if (q.type === "file_upload") {
        if (
          typeof value !== "object" ||
          Array.isArray(value) ||
          !value ||
          !("url" in value)
        ) {
          next[q.id] = ui.invalidFileAnswer;
        }
      }
    }
    return next;
  }

  async function uploadFile(questionId: string, file: File | null) {
    if (!file) {
      setValue(questionId, null);
      return;
    }
    setUploadingId(questionId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    try {
      const body = new FormData();
      body.set("questionId", questionId);
      body.set("file", file);
      const res = await fetch(`/api/f/${form.slug}/upload`, {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        file?: FileAnswerValue;
      };
      if (!res.ok || !data.ok || !data.file) {
        setErrors((prev) => ({
          ...prev,
          [questionId]: data.error ?? ui.invalidFileAnswer,
        }));
        setValue(questionId, null);
        return;
      }
      setValue(questionId, data.file);
    } catch {
      setErrors((prev) => ({
        ...prev,
        [questionId]: ui.networkError,
      }));
      setValue(questionId, null);
    } finally {
      setUploadingId(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || uploadingId) {
      if (uploadingId) setFormError(ui.uploadingFile);
      return;
    }
    setFormError(null);

    const localErrors = clientValidate();
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }

    setPending(true);
    try {
      const answers = questions.map((q) => ({
        questionId: q.id,
        value: values[q.id] ?? null,
      }));

      const res = await fetch(`/api/f/${form.slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        confirmationMessage?: string;
        errors?: { questionId: string; message: string }[];
      };

      if (!res.ok || !data.ok) {
        if (data.errors?.length) {
          const mapped: FieldErrors = {};
          for (const err of data.errors) {
            mapped[err.questionId] = err.message;
          }
          setErrors(mapped);
        }
        setFormError(data.error ?? ui.couldNotSubmit);
        return;
      }

      setConfirmation(
        data.confirmationMessage ?? form.confirmationMessage,
      );
      setDone(true);
    } catch {
      setFormError(ui.networkError);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div
        className="motion-fade-in space-y-4 rounded-md border border-border bg-bg-elevated p-6 sm:p-8"
        role="status"
        aria-live="polite"
      >
        <p className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ink">
          {ui.responseRecorded}
        </p>
        <p className="whitespace-pre-wrap text-ink-muted">{confirmation}</p>
      </div>
    );
  }

  if (form.status === "closed") {
    return (
      <div
        className="space-y-3 rounded-md border border-border bg-bg-elevated p-6"
        role="status"
      >
        <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
          {form.title}
        </h1>
        <p className="text-ink-muted">{ui.formClosedBody}</p>
      </div>
    );
  }

  const fieldClass =
    "w-full rounded-md border border-border bg-bg-elevated px-3 text-ink";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      noValidate
    >
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-ink">
          {form.title}
        </h1>
        {form.description ? (
          <p className="whitespace-pre-wrap text-ink-muted">
            {form.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-6">
        {questions.map((question, questionIndex) => {
          const fieldId = `q-${question.id}`;
          const helpId = `${fieldId}-help`;
          const errorId = `${fieldId}-error`;
          const error = errors[question.id];
          const isFirst = questionIndex === 0;
          const describedBy = [
            question.helpText ? helpId : null,
            error ? errorId : null,
          ]
            .filter(Boolean)
            .join(" ") || undefined;

          return (
            <div key={question.id} className="space-y-2">
              <label
                htmlFor={
                  question.type === "multiple_choice" ||
                  question.type === "checkboxes"
                    ? undefined
                    : fieldId
                }
                className="block text-sm font-medium text-ink"
              >
                {question.type === "multiple_choice" ||
                question.type === "checkboxes" ? (
                  <span>{question.label}</span>
                ) : (
                  <>{question.label}</>
                )}
                {question.required ? (
                  <>
                    <span className="text-danger" aria-hidden="true">
                      {" "}
                      *
                    </span>
                    <span className="sr-only"> {ui.requiredMark}</span>
                  </>
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
                  ref={isFirst ? (el) => { firstFieldRef.current = el; } : undefined}
                  rows={4}
                  required={question.required}
                  aria-required={question.required || undefined}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  value={String(values[question.id] ?? "")}
                  onChange={(e) => setValue(question.id, e.target.value)}
                  className={`${fieldClass} py-2`}
                />
              ) : question.type === "multiple_choice" ? (
                <fieldset
                  className="space-y-2"
                  aria-required={question.required || undefined}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                >
                  <legend className="sr-only">{question.label}</legend>
                  {(question.options?.choices ?? []).map((choice, choiceIndex) => (
                    <label
                      key={choice.id}
                      className="flex min-h-11 items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name={fieldId}
                        value={choice.id}
                        ref={
                          isFirst && choiceIndex === 0
                            ? (el) => { firstFieldRef.current = el; }
                            : undefined
                        }
                        checked={values[question.id] === choice.id}
                        onChange={() => setValue(question.id, choice.id)}
                        required={question.required}
                      />
                      <span>{choice.label}</span>
                    </label>
                  ))}
                </fieldset>
              ) : question.type === "checkboxes" ? (
                <fieldset
                  className="space-y-2"
                  aria-required={question.required || undefined}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                >
                  <legend className="sr-only">{question.label}</legend>
                  {(question.options?.choices ?? []).map((choice, choiceIndex) => {
                    const selected = Array.isArray(values[question.id])
                      ? (values[question.id] as string[])
                      : [];
                    return (
                      <label
                        key={choice.id}
                        className="flex min-h-11 items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          value={choice.id}
                          ref={
                            isFirst && choiceIndex === 0
                              ? (el) => { firstFieldRef.current = el; }
                              : undefined
                          }
                          checked={selected.includes(choice.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selected, choice.id]
                              : selected.filter((id) => id !== choice.id);
                            setValue(question.id, next);
                          }}
                        />
                        <span>{choice.label}</span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : question.type === "dropdown" ? (
                <select
                  id={fieldId}
                  ref={isFirst ? (el) => { firstFieldRef.current = el; } : undefined}
                  required={question.required}
                  aria-required={question.required || undefined}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  value={String(values[question.id] ?? "")}
                  onChange={(e) => setValue(question.id, e.target.value)}
                  className={`${fieldClass} min-h-11`}
                >
                  <option value="">{ui.selectOption}</option>
                  {(question.options?.choices ?? []).map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              ) : question.type === "file_upload" ? (
                <div className="space-y-2">
                  <input
                    id={fieldId}
                    ref={isFirst ? (el) => { firstFieldRef.current = el; } : undefined}
                    type="file"
                    required={
                      question.required &&
                      !(
                        values[question.id] &&
                        typeof values[question.id] === "object" &&
                        !Array.isArray(values[question.id]) &&
                        "url" in (values[question.id] as object)
                      )
                    }
                    aria-required={question.required || undefined}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy}
                    disabled={uploadingId === question.id || pending}
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void uploadFile(question.id, file);
                    }}
                    className="block w-full text-sm text-ink file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-bg-elevated file:px-3 file:text-sm file:font-medium file:text-ink"
                  />
                  <p className="text-xs text-ink-muted">{ui.fileUploadHint}</p>
                  {uploadingId === question.id ? (
                    <p className="text-sm text-ink-muted" aria-live="polite">
                      {ui.uploadingFile}
                    </p>
                  ) : null}
                  {values[question.id] &&
                  typeof values[question.id] === "object" &&
                  !Array.isArray(values[question.id]) &&
                  "name" in (values[question.id] as object) ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-success">{ui.fileReady}:</span>
                      <span className="font-medium text-ink">
                        {(values[question.id] as FileAnswerValue).name}
                      </span>
                      <button
                        type="button"
                        className="text-danger underline-offset-2 hover:underline"
                        onClick={() => setValue(question.id, null)}
                      >
                        {ui.removeFile}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <input
                  id={fieldId}
                  ref={isFirst ? (el) => { firstFieldRef.current = el; } : undefined}
                  type={
                    question.type === "email"
                      ? "email"
                      : question.type === "number"
                        ? "number"
                        : question.type === "date"
                          ? "date"
                          : "text"
                  }
                  required={question.required}
                  aria-required={question.required || undefined}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy}
                  value={String(values[question.id] ?? "")}
                  onChange={(e) => setValue(question.id, e.target.value)}
                  className={`${fieldClass} min-h-11`}
                  placeholder={
                    isChoiceQuestionType(question.type)
                      ? undefined
                      : ui.yourAnswer
                  }
                />
              )}

              {error ? (
                <p id={errorId} role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {formError ? (
        <p id={statusId} role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-5 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending ? ui.submitting : ui.submit}
      </button>
    </form>
  );
}
