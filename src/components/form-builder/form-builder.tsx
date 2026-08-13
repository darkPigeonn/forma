"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveFormQuestionsAction } from "@/app/actions/forms";
import { FormFillPreview } from "@/components/form-fill/form-fill-preview";
import { QuestionEditor } from "@/components/form-builder/question-editor";
import {
  createQuestion,
  normalizeQuestionOrder,
} from "@/domain/forms";
import type { QuestionInput } from "@/lib/validators/question";
import { saveFormQuestionsSchema } from "@/lib/validators/question";
import type { QuestionType } from "@/lib/form-constants";
import { QUESTION_TYPES } from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";

const AUTOSAVE_MS = 600;

type FormBuilderProps = {
  formId: string;
  title: string;
  description: string;
  initialQuestions: QuestionInput[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function FormBuilder({
  formId,
  title,
  description,
  initialQuestions,
}: FormBuilderProps) {
  const [questions, setQuestions] = useState<QuestionInput[]>(
    normalizeQuestionOrder(initialQuestions),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const questionsRef = useRef(questions);
  const skipFirstSave = useRef(true);
  const savedSnapshot = useRef(JSON.stringify(normalizeQuestionOrder(initialQuestions)));

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const persist = useCallback(async (next: QuestionInput[]) => {
    const payload = normalizeQuestionOrder(next);
    const snapshot = JSON.stringify(payload);
    if (snapshot === savedSnapshot.current) {
      return;
    }

    const local = saveFormQuestionsSchema.safeParse({
      formId,
      questions: payload,
    });
    if (!local.success) {
      setSaveState("error");
      setError(local.error.issues[0]?.message ?? ui.fixQuestionErrors);
      return;
    }

    setSaveState("saving");
    setError(null);
    const result = await saveFormQuestionsAction(local.data);

    if (!result.ok) {
      setSaveState("error");
      setError(result.error);
      return;
    }

    savedSnapshot.current = snapshot;
    setSaveState("saved");
  }, [formId]);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }

    const handle = window.setTimeout(() => {
      void persist(questionsRef.current);
    }, AUTOSAVE_MS);

    return () => window.clearTimeout(handle);
  }, [questions, persist]);

  function updateQuestion(index: number, question: QuestionInput) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = question;
      return normalizeQuestionOrder(next);
    });
  }

  function deleteQuestion(index: number) {
    setQuestions((prev) => {
      if (prev.length <= 1) return prev;
      return normalizeQuestionOrder(prev.filter((_, i) => i !== index));
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item!);
      return normalizeQuestionOrder(next);
    });
  }

  function addQuestion(type: QuestionType = "short_text") {
    setQuestions((prev) =>
      normalizeQuestionOrder([...prev, createQuestion(type, prev.length)]),
    );
  }

  const statusText =
    saveState === "saving"
      ? ui.saving
      : saveState === "saved"
        ? ui.saved
        : saveState === "error"
          ? ui.saveFailed
          : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold">
          {ui.questions}
        </h2>
        <p className="text-sm text-ink-muted" aria-live="polite">
          {statusText}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              total={questions.length}
              onChange={(q) => updateQuestion(index, q)}
              onDelete={() => deleteQuestion(index)}
              onMoveUp={() => moveQuestion(index, -1)}
              onMoveDown={() => moveQuestion(index, 1)}
            />
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => addQuestion("short_text")}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover sm:flex-none"
            >
              {ui.addQuestion}
            </button>
            <label className="sr-only" htmlFor="add-question-type">
              {ui.addSpecificType}
            </label>
            <select
              id="add-question-type"
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value as QuestionType | "";
                if (!value) return;
                addQuestion(value);
                e.target.value = "";
              }}
              className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-sm"
            >
              <option value="" disabled>
                {ui.orPickType}
              </option>
              {QUESTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {ui.questionTypes[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <aside
          className="hidden lg:block"
          aria-label={ui.livePreview}
        >
          <div className="sticky top-6 space-y-3 rounded-md border border-border bg-bg-elevated p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {ui.preview}
            </p>
            <FormFillPreview
              title={title}
              description={description}
              questions={questions}
            />
          </div>
        </aside>
      </div>

      <div className="lg:hidden">
        <details className="rounded-md border border-border bg-bg-elevated p-4">
          <summary className="cursor-pointer text-sm font-medium">
            {ui.previewForm}
          </summary>
          <div className="mt-4">
            <FormFillPreview
              title={title}
              description={description}
              questions={questions}
            />
          </div>
        </details>
      </div>
    </div>
  );
}
