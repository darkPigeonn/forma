"use client";

import { useMemo, useState } from "react";
import type { ResponseSubmission } from "@/domain/response-analytics";
import { formatAnswerDisplay } from "@/domain/responses";
import { ui } from "@/lib/ui-id";
import type { QuestionInput } from "@/lib/validators/question";

const PAGE_SIZE = 25;

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

export function ResponsesByQuestion({
  questions,
  submissions,
  onViewResponse,
}: ResponsesByQuestionProps) {
  const [pageByQuestion, setPageByQuestion] = useState<Record<string, number>>({});

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

  return (
    <div className="space-y-4">
      {sections.map(({ question, rows }) => {
        const page = pageByQuestion[question.id] ?? 0;
        const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        const safePage = Math.min(page, totalPages - 1);
        const slice = rows.slice(
          safePage * PAGE_SIZE,
          safePage * PAGE_SIZE + PAGE_SIZE,
        );

        return (
          <section
            key={question.id}
            className="overflow-hidden rounded-xl border border-border bg-bg-elevated"
            aria-labelledby={`question-${question.id}`}
          >
            <div className="border-b border-border px-4 py-3">
              <h3
                id={`question-${question.id}`}
                className="font-medium text-ink"
              >
                {question.label}
              </h3>
              <p className="mt-0.5 text-sm text-ink-muted">
                {ui.responseByQuestionCount(rows.length)}
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="px-4 py-6 text-sm italic text-ink-muted">
                {ui.noAnswer}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <caption className="sr-only">
                      {ui.responseByQuestionTable(question.label)}
                    </caption>
                    <thead className="border-b border-border text-ink-muted">
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
                      {slice.map((row) => (
                        <tr
                          key={`${question.id}-${row.responseId}`}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-4 py-3 font-medium text-ink">
                            {row.respondentLabel}
                          </td>
                          <td className="max-w-md px-4 py-3 text-ink">
                            <p className="line-clamp-3 whitespace-pre-wrap">
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

                {totalPages > 1 ? (
                  <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                    <p className="text-sm text-ink-muted">
                      {ui.pageOf(safePage + 1, totalPages)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={safePage <= 0}
                        onClick={() =>
                          setPageByQuestion((prev) => ({
                            ...prev,
                            [question.id]: safePage - 1,
                          }))
                        }
                        className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-50"
                      >
                        {ui.previousPage}
                      </button>
                      <button
                        type="button"
                        disabled={safePage >= totalPages - 1}
                        onClick={() =>
                          setPageByQuestion((prev) => ({
                            ...prev,
                            [question.id]: safePage + 1,
                          }))
                        }
                        className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-50"
                      >
                        {ui.nextPage}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
