"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ResponseSubmission } from "@/domain/response-analytics";
import { formatAnswerDisplay } from "@/domain/responses";
import {
  buildWorkspaceQuery,
  parseQuestionFilter,
} from "@/lib/form-workspace-url";
import type { QuestionType } from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";
import type { QuestionInput } from "@/lib/validators/question";

const MAX_ANSWER_FILTER_OPTIONS = 30;

type ResponsesByQuestionProps = {
  questions: QuestionInput[];
  submissions: ResponseSubmission[];
  onViewResponse: (responseId: string) => void;
};

type QuestionRow = {
  responseId: string;
  respondentLabel: string;
  displayValue: string;
};

type SectionFilter = {
  search: string;
  answerValue: string;
};

const TEXT_QUESTION_TYPES = new Set<QuestionType>([
  "short_text",
  "long_text",
  "email",
  "file_upload",
]);

function supportsAnswerValueFilter(
  question: QuestionInput,
  optionCount: number,
): boolean {
  if (optionCount === 0 || optionCount > MAX_ANSWER_FILTER_OPTIONS) return false;
  return !TEXT_QUESTION_TYPES.has(question.type);
}

function filterRows(
  rows: QuestionRow[],
  filter: SectionFilter,
): QuestionRow[] {
  const search = filter.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter.answerValue && row.displayValue !== filter.answerValue) {
      return false;
    }
    if (!search) return true;
    return (
      row.respondentLabel.toLowerCase().includes(search) ||
      row.displayValue.toLowerCase().includes(search)
    );
  });
}

function QuestionSectionFilters({
  question,
  rows,
  filter,
  onChange,
}: {
  question: QuestionInput;
  rows: QuestionRow[];
  filter: SectionFilter;
  onChange: (next: SectionFilter) => void;
}) {
  const answerOptions = useMemo(() => {
    const values = [...new Set(rows.map((row) => row.displayValue))];
    return values.sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const showAnswerFilter = supportsAnswerValueFilter(question, answerOptions.length);
  const fieldClass =
    "min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-ink";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="min-w-0 flex-1">
        <span className="sr-only">{ui.searchInQuestion}</span>
        <input
          type="search"
          value={filter.search}
          onChange={(event) =>
            onChange({ ...filter, search: event.target.value })
          }
          placeholder={ui.searchInQuestion}
          className={fieldClass}
        />
      </label>
      {showAnswerFilter ? (
        <label className="w-full sm:w-56">
          <span className="sr-only">{ui.filterByAnswer}</span>
          <select
            value={filter.answerValue}
            onChange={(event) =>
              onChange({ ...filter, answerValue: event.target.value })
            }
            className={fieldClass}
          >
            <option value="">{ui.allAnswers}</option>
            {answerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function ResponsesByQuestion({
  questions,
  submissions,
  onViewResponse,
}: ResponsesByQuestionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedQuestionId = parseQuestionFilter(searchParams.get("q"));
  const [filtersByQuestion, setFiltersByQuestion] = useState<
    Record<string, SectionFilter>
  >({});

  const sections = useMemo(() => {
    const sorted = [...questions].sort((a, b) => a.order - b.order);
    return sorted.map((question) => {
      const rows: QuestionRow[] = [];
      for (const submission of submissions) {
        const answer = submission.answers.find(
          (item) => item.questionId === question.id,
        );
        const displayValue = formatAnswerDisplay(
          question,
          answer?.value ?? null,
        ).trim();
        if (!displayValue) continue;
        rows.push({
          responseId: submission.id,
          respondentLabel: submission.respondentLabel,
          displayValue,
        });
      }
      rows.sort((a, b) =>
        a.respondentLabel.localeCompare(b.respondentLabel, "id"),
      );
      return { question, rows };
    });
  }, [questions, submissions]);

  const questionIds = useMemo(
    () => new Set(sections.map((section) => section.question.id)),
    [sections],
  );

  const visibleSections = useMemo(() => {
    if (!selectedQuestionId || !questionIds.has(selectedQuestionId)) {
      return sections;
    }
    return sections.filter(
      (section) => section.question.id === selectedQuestionId,
    );
  }, [questionIds, sections, selectedQuestionId]);

  function setSelectedQuestion(questionId: string | null) {
    const href = `${pathname}${buildWorkspaceQuery(searchParams, {
      tab: "responses",
      responsesView: "list",
      listMode: "question",
      questionId,
    })}`;
    router.replace(href, { scroll: false });
  }

  function getSectionFilter(questionId: string): SectionFilter {
    return (
      filtersByQuestion[questionId] ?? {
        search: "",
        answerValue: "",
      }
    );
  }

  function setSectionFilter(questionId: string, next: SectionFilter) {
    setFiltersByQuestion((prev) => ({ ...prev, [questionId]: next }));
  }

  const fieldClass =
    "min-h-11 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-ink sm:max-w-md";

  return (
    <div className="space-y-4">
      <div className="forma-section">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{ui.filterByQuestion}</span>
          <select
            value={
              selectedQuestionId && questionIds.has(selectedQuestionId)
                ? selectedQuestionId
                : ""
            }
            onChange={(event) =>
              setSelectedQuestion(event.target.value || null)
            }
            className={fieldClass}
          >
            <option value="">{ui.allQuestions}</option>
            {sections.map(({ question }) => (
              <option key={question.id} value={question.id}>
                {question.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visibleSections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-bg-elevated px-4 py-8 text-center text-sm text-ink-muted">
          {ui.noMatchingResponses}
        </p>
      ) : null}

      {visibleSections.map(({ question, rows }) => {
        const filter = getSectionFilter(question.id);
        const filteredRows = filterRows(rows, filter);

        return (
          <section
            key={question.id}
            className="flex max-h-[min(70vh,40rem)] flex-col overflow-hidden rounded-xl border border-border bg-bg-elevated"
            aria-labelledby={`question-${question.id}`}
          >
            <div className="shrink-0 space-y-3 border-b border-border px-4 py-3">
              <div>
                <h3
                  id={`question-${question.id}`}
                  className="font-medium text-ink"
                >
                  {question.label}
                </h3>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {ui.responseByQuestionFilteredCount(
                    filteredRows.length,
                    rows.length,
                  )}
                </p>
              </div>
              {rows.length > 0 ? (
                <QuestionSectionFilters
                  question={question}
                  rows={rows}
                  filter={filter}
                  onChange={(next) => setSectionFilter(question.id, next)}
                />
              ) : null}
            </div>

            {rows.length === 0 ? (
              <p className="px-4 py-6 text-sm italic text-ink-muted">
                {ui.noAnswer}
              </p>
            ) : filteredRows.length === 0 ? (
              <p className="px-4 py-6 text-sm italic text-ink-muted">
                {ui.noMatchingResponses}
              </p>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <caption className="sr-only">
                      {ui.responseByQuestionTable(question.label)}
                    </caption>
                    <thead className="sticky top-0 z-10 border-b border-border bg-bg-elevated text-ink-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-medium">
                          {ui.respondentCol}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          {ui.answerCol}
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          <span className="sr-only">{ui.actions}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr
                          key={`${question.id}-${row.responseId}`}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-4 py-3 font-medium text-ink">
                            {row.respondentLabel}
                          </td>
                          <td className="max-w-md px-4 py-3 text-ink">
                            <p className="whitespace-pre-wrap break-words">
                              {row.displayValue}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onViewResponse(row.responseId)}
                              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted"
                            >
                              {ui.view}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
