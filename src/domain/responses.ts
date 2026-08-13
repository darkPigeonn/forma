import type { QuestionInput } from "@/lib/validators/question";
import { isChoiceQuestionType } from "@/lib/validators/question";
import type { AnswerValue } from "@/domain/answers";
import { ui } from "@/lib/ui-id";

export function formatAnswerDisplay(
  question: QuestionInput | undefined,
  value: AnswerValue,
): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    if (!value.length) return "";
    if (!question) return value.join(", ");
    const labels = value.map((id) => {
      const choice = question.options?.choices?.find((c) => c.id === id);
      return choice?.label ?? id;
    });
    return labels.join(", ");
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "name" in value && "url" in value) {
    return value.name || value.url;
  }
  if (
    question &&
    (question.type === "multiple_choice" || question.type === "dropdown")
  ) {
    const choice = question.options?.choices?.find((c) => c.id === value);
    return choice?.label ?? value;
  }
  return String(value);
}

export type ChoiceOptionStat = {
  id: string;
  label: string;
  count: number;
  percent: number;
};

export type ChoiceQuestionSummary = {
  questionId: string;
  label: string;
  type: QuestionInput["type"];
  options: ChoiceOptionStat[];
};

export function buildChoiceSummaries(
  questions: QuestionInput[],
  responses: Array<{
    answers: Array<{ questionId: string; value: AnswerValue }>;
  }>,
): ChoiceQuestionSummary[] {
  const total = responses.length;
  if (!total) return [];

  return questions
    .filter((q) => isChoiceQuestionType(q.type))
    .map((question) => {
      const counts = new Map<string, number>();
      for (const choice of question.options?.choices ?? []) {
        counts.set(choice.id, 0);
      }

      for (const response of responses) {
        const answer = response.answers.find(
          (a) => a.questionId === question.id,
        );
        if (!answer || answer.value === null || answer.value === undefined) {
          continue;
        }
        if (Array.isArray(answer.value)) {
          for (const id of answer.value) {
            if (counts.has(id)) {
              counts.set(id, (counts.get(id) ?? 0) + 1);
            }
          }
        } else if (typeof answer.value === "string" && counts.has(answer.value)) {
          counts.set(answer.value, (counts.get(answer.value) ?? 0) + 1);
        }
      }

      const options: ChoiceOptionStat[] = (
        question.options?.choices ?? []
      ).map((choice) => {
        const count = counts.get(choice.id) ?? 0;
        return {
          id: choice.id,
          label: choice.label,
          count,
          percent: Math.round((count / total) * 1000) / 10,
        };
      });

      return {
        questionId: question.id,
        label: question.label,
        type: question.type,
        options,
      };
    });
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildResponsesCsv(
  questions: QuestionInput[],
  responses: Array<{
    submittedAt: string;
    answers: Array<{ questionId: string; value: AnswerValue }>;
  }>,
): string {
  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const headers = [
    ui.submittedAtCsv,
    ...sortedQuestions.map((q) => q.label || q.id),
  ];

  const rows = responses.map((response) => {
    const byId = new Map(
      response.answers.map((a) => [a.questionId, a.value] as const),
    );
    return [
      response.submittedAt,
      ...sortedQuestions.map((q) =>
        formatAnswerDisplay(q, byId.get(q.id) ?? null),
      ),
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => csvEscape(String(cell))).join(","))
    .join("\r\n");
}
