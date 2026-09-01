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
import { buildFormPages } from "@/domain/forms";
import type { QuestionInput } from "@/lib/validators/question";
import { isChoiceQuestionType } from "@/lib/validators/question";
import { RangeQuestionInput } from "@/components/form-fill/range-question-input";
import { FormQuestionCard } from "@/components/form-fill/form-question-card";
import {
  RespondentEmailBanner,
} from "@/components/form-fill/respondent-email-auth";
import { useRespondentBrowserEmail } from "@/components/form-fill/use-respondent-browser-email";
import { formFillTypography } from "@/components/form-fill/form-fill-typography";
import { normalizeRangeValue } from "@/lib/range-question";
import { formatDateTime } from "@/lib/format-date";
import { localSubmittedKey } from "@/lib/respondent-cookie";
import { ui } from "@/lib/ui-id";

type PublicFormFillProps = {
  form: PublicFormView;
  alreadySubmitted?: boolean;
};

type FieldErrors = Record<string, string>;

function readLocalSubmitted(
  formId: string,
  limitOneResponse: boolean,
  alreadySubmitted: boolean,
) {
  if (alreadySubmitted) {
    return { done: true, repeatVisit: true };
  }
  if (!limitOneResponse) {
    return { done: false, repeatVisit: false };
  }
  try {
    const submitted = Boolean(
      window.localStorage.getItem(localSubmittedKey(formId)),
    );
    return { done: submitted, repeatVisit: submitted };
  } catch {
    return { done: false, repeatVisit: false };
  }
}

export function PublicFormFill({
  form,
  alreadySubmitted = false,
}: PublicFormFillProps) {
  const questions = useMemo(
    () => [...form.questions].sort((a, b) => a.order - b.order),
    [form.questions],
  );
  const pages = useMemo(
    () => buildFormPages(form.sections ?? [], questions, { skipEmpty: true }),
    [form.sections, questions],
  );
  const [pageIndex, setPageIndex] = useState(0);
  const currentPage = pages[Math.min(pageIndex, pages.length - 1)] ?? pages[0];
  const currentQuestions = currentPage?.questions ?? questions;
  const isLastPage = pageIndex >= pages.length - 1;
  const multiPage = pages.length > 1;

  const [values, setValues] = useState<Record<string, AnswerValue>>(() => {
    const initial: Record<string, AnswerValue> = {};
    for (const q of questions) {
      if (q.type === "checkboxes") initial[q.id] = [];
      else if (q.type === "file_upload" || q.type === "range") initial[q.id] = null;
      else initial[q.id] = "";
    }
    return initial;
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const initialVisit = readLocalSubmitted(
    form.id,
    form.limitOneResponse,
    alreadySubmitted,
  );
  const [done, setDone] = useState(initialVisit.done);
  const [confirmation, setConfirmation] = useState(form.confirmationMessage);
  const [repeatVisit, setRepeatVisit] = useState(initialVisit.repeatVisit);
  const [receipt, setReceipt] = useState<{
    id: string;
    submittedAt: string;
  } | null>(null);
  const {
    respondentAuth,
    alreadySubmitted: alreadySubmittedByEmail,
    detecting: detectingRespondentEmail,
    clearRespondentEmail,
  } = useRespondentBrowserEmail(form.slug, form.collectRespondentEmail);
  const statusId = useId();
  const firstFieldRef = useRef<HTMLElement | null>(null);

  const skipPageScroll = useRef(true);

  useEffect(() => {
    if (!alreadySubmittedByEmail || done) return;
    setRepeatVisit(true);
    setDone(true);
  }, [alreadySubmittedByEmail, done]);

  useEffect(() => {
    if (form.status !== "published" || done) return;
    firstFieldRef.current?.focus();
    if (skipPageScroll.current) {
      skipPageScroll.current = false;
      return;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document.getElementById("public-form-top")?.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [form.status, done, pageIndex]);

  function setValue(questionId: string, value: AnswerValue) {
    setValues((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function clientValidate(scope: QuestionInput[] = questions): FieldErrors {
    const next: FieldErrors = {};
    for (const q of scope) {
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
      if (q.type === "range") {
        if (normalizeRangeValue(q, value) === null) {
          next[q.id] = ui.validRangeValue;
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

    if (!isLastPage) {
      const pageErrors = clientValidate(currentQuestions);
      if (Object.keys(pageErrors).length) {
        setErrors(pageErrors);
        return;
      }
      setPageIndex((index) => Math.min(index + 1, pages.length - 1));
      return;
    }

    const localErrors = clientValidate(questions);
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      const firstId = Object.keys(localErrors)[0];
      const errorPage = pages.findIndex((page) =>
        page.questions.some((question) => question.id === firstId),
      );
      if (errorPage >= 0) setPageIndex(errorPage);
      return;
    }

    setPending(true);
    try {
      let respondentIdToken: string | undefined;
      if (form.collectRespondentEmail && respondentAuth) {
        try {
          respondentIdToken = await respondentAuth.getIdToken();
        } catch {
          // Submit without email if token refresh fails.
        }
      }

      const answers = questions.map((q) => ({
        questionId: q.id,
        value: values[q.id] ?? null,
      }));

      const res = await fetch(`/api/f/${form.slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, respondentIdToken }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        confirmationMessage?: string;
        alreadySubmitted?: boolean;
        receiptId?: string;
        submittedAt?: string;
        errors?: { questionId: string; message: string }[];
      };

      if (data.errors?.length) {
        const mapped: FieldErrors = {};
        for (const err of data.errors) {
          mapped[err.questionId] = err.message;
        }
        setErrors(mapped);
        const firstId = data.errors[0]?.questionId;
        const errorPage = pages.findIndex((page) =>
          page.questions.some((question) => question.id === firstId),
        );
        if (errorPage >= 0) setPageIndex(errorPage);
        setFormError(data.error ?? ui.couldNotSubmit);
        return;
      }

      if (data.alreadySubmitted) {
        if (!form.limitOneResponse) {
          setFormError(data.error ?? ui.couldNotSubmit);
          return;
        }
        try {
          window.localStorage.setItem(localSubmittedKey(form.id), "1");
        } catch {
          // ignore
        }
        setRepeatVisit(true);
        setDone(true);
        return;
      }

      if (!res.ok || !data.ok) {
        setFormError(data.error ?? ui.couldNotSubmit);
        return;
      }

      setConfirmation(
        data.confirmationMessage ?? form.confirmationMessage,
      );
      if (data.receiptId) {
        setReceipt({
          id: data.receiptId,
          submittedAt: data.submittedAt ?? new Date().toISOString(),
        });
      }
      if (form.limitOneResponse) {
        try {
          window.localStorage.setItem(localSubmittedKey(form.id), "1");
        } catch {
          // ignore
        }
      }
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
        <p className={formFillTypography.title}>
          {repeatVisit ? ui.alreadySubmitted : ui.responseRecorded}
        </p>
        <p className={`whitespace-pre-wrap ${formFillTypography.lead}`}>
          {repeatVisit ? ui.alreadySubmittedBody : confirmation}
        </p>
        {receipt && !repeatVisit ? (
          <ReceiptBlock
            title={form.title}
            receiptId={receipt.id}
            submittedAt={receipt.submittedAt}
          />
        ) : null}
      </div>
    );
  }

  if (form.status === "closed") {
    return (
      <div
        className="space-y-3 rounded-md border border-border bg-bg-elevated p-6"
        role="status"
      >
        <h1 className={formFillTypography.title}>
          {form.title}
        </h1>
        <p className={formFillTypography.lead}>{ui.formClosedBody}</p>
      </div>
    );
  }

  const fieldClass = formFillTypography.field;

  return (
    <form
      id="public-form-top"
      onSubmit={onSubmit}
      className="space-y-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      noValidate
    >
      <div className="space-y-2">
        <h1 className={formFillTypography.title}>
          {form.title}
        </h1>
        {pageIndex === 0 && form.description ? (
          <p className={`whitespace-pre-wrap ${formFillTypography.lead}`}>
            {form.description}
          </p>
        ) : null}
      </div>

      {form.collectRespondentEmail ? (
        <RespondentEmailBanner
          email={respondentAuth?.email}
          detecting={detectingRespondentEmail}
          pending={pending}
          onDismiss={() => void clearRespondentEmail()}
        />
      ) : null}

      {multiPage ? (
        <div className="space-y-2">
          <p className={formFillTypography.meta}>
            {ui.pageOf(pageIndex + 1, pages.length)}
          </p>
          <div
            role="progressbar"
            aria-label={ui.formProgress}
            aria-valuemin={1}
            aria-valuemax={pages.length}
            aria-valuenow={pageIndex + 1}
            className="h-1.5 overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full bg-accent"
              style={{
                width: `${((pageIndex + 1) / pages.length) * 100}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {currentPage?.section.title || currentPage?.section.description ? (
        <div className="space-y-1">
          {currentPage.section.title ? (
            <h2 className={formFillTypography.sectionTitle}>
              {currentPage.section.title}
            </h2>
          ) : null}
          {currentPage.section.description ? (
            <p className={`whitespace-pre-wrap ${formFillTypography.lead}`}>
              {currentPage.section.description}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {currentQuestions.map((question, questionIndex) => {
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
            <FormQuestionCard key={question.id}>
              <div className="space-y-2">
              <label
                htmlFor={
                  question.type === "multiple_choice" ||
                  question.type === "checkboxes" ||
                  question.type === "range"
                    ? undefined
                    : fieldId
                }
                className={formFillTypography.questionLabel}
              >
                {question.type === "multiple_choice" ||
                question.type === "checkboxes" ||
                question.type === "range" ? (
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
                <p id={helpId} className={formFillTypography.questionHelp}>
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
                      className={formFillTypography.choiceOption}
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
                        className={formFillTypography.choiceOption}
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
              ) : question.type === "range" ? (
                <RangeQuestionInput
                  question={question}
                  name={fieldId}
                  describedBy={describedBy}
                  invalid={Boolean(error)}
                  required={question.required}
                  disabled={pending}
                  value={values[question.id]}
                  firstInputRef={
                    isFirst
                      ? (el) => {
                          firstFieldRef.current = el;
                        }
                      : undefined
                  }
                  onChange={(next) => setValue(question.id, next)}
                />
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
                    className="block w-full text-base text-ink file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-bg-elevated file:px-3 file:text-base file:font-medium file:text-ink"
                  />
                  <p className={formFillTypography.hint}>{ui.fileUploadHint}</p>
                  {uploadingId === question.id ? (
                    <p className={formFillTypography.hint} aria-live="polite">
                      {ui.uploadingFile}
                    </p>
                  ) : null}
                  {values[question.id] &&
                  typeof values[question.id] === "object" &&
                  !Array.isArray(values[question.id]) &&
                  "name" in (values[question.id] as object) ? (
                    <div className="flex flex-wrap items-center gap-2 text-base">
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
                <p id={errorId} role="alert" className={formFillTypography.error}>
                  {error}
                </p>
              ) : null}
              </div>
            </FormQuestionCard>
          );
        })}
      </div>

      {formError ? (
        <p id={statusId} role="alert" className={formFillTypography.error}>
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {multiPage && pageIndex > 0 ? (
          <button
            type="button"
            onClick={() => setPageIndex((index) => Math.max(index - 1, 0))}
            className={`inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 ${formFillTypography.button} text-ink hover:border-ink-muted`}
          >
            {ui.previousPage}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-accent px-5 ${formFillTypography.button} text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:w-auto`}
        >
          {pending
            ? ui.submitting
            : isLastPage
              ? ui.submit
              : ui.nextPage}
        </button>
      </div>
    </form>
  );
}

function ReceiptBlock({
  title,
  receiptId,
  submittedAt,
}: {
  title: string;
  receiptId: string;
  submittedAt: string;
}) {
  const [copied, setCopied] = useState(false);
  const summary = `${title}\n${ui.receiptId}: ${receiptId}\n${ui.receiptTime}: ${formatDateTime(submittedAt)}`;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-bg-elevated p-4">
      <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">
        {ui.receiptTitle}
      </p>
      <dl className="space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-ink-muted">{ui.receiptId}</dt>
          <dd className="font-mono font-medium">{receiptId}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-muted">{ui.receiptTime}</dt>
          <dd>{formatDateTime(submittedAt)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={() => void copySummary()}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted"
        >
          {copied ? ui.receiptCopied : ui.copyReceipt}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted"
        >
          {ui.printReceipt}
        </button>
      </div>
    </div>
  );
}
