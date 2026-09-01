import type { AnswerValue } from "@/domain/answers";
import { formatAnswerDisplay } from "@/domain/responses";
import { normalizeRangeValue } from "@/lib/range-question";
import type { ResponseSubmission } from "@/domain/response-analytics";
import type { QuestionInput } from "@/lib/validators/question";
import { isChoiceQuestionType } from "@/lib/validators/question";

export type SegmentDefinition = {
  id: string;
  label: string;
  min: number;
  max: number;
};

export const DEFAULT_PARTICIPATION_SEGMENTS: SegmentDefinition[] = [
  { id: "low", label: "Rendah (nilai 1–4)", min: 1, max: 4 },
  { id: "mid", label: "Cukup (nilai 5–7)", min: 5, max: 7 },
  { id: "high", label: "Baik (nilai 8–10)", min: 8, max: 10 },
];

function numericAnswer(
  question: QuestionInput,
  value: AnswerValue,
): number | null {
  if (question.type === "range") {
    return normalizeRangeValue(question, value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function roundStat(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function findAnchorRangeQuestion(
  questions: QuestionInput[],
): QuestionInput | null {
  return (
    [...questions]
      .sort((a, b) => a.order - b.order)
      .find((question) => question.type === "range") ?? null
  );
}

export function buildSegmentCrossTabs(input: {
  anchorQuestion: QuestionInput;
  choiceQuestions: QuestionInput[];
  submissions: ResponseSubmission[];
  segments?: SegmentDefinition[];
}) {
  const { anchorQuestion, choiceQuestions, submissions } = input;
  const segments = input.segments ?? DEFAULT_PARTICIPATION_SEGMENTS;
  const total = submissions.length || 1;

  return segments.map((segment) => {
    const members = submissions.filter((submission) => {
      const answer = submission.answers.find(
        (item) => item.questionId === anchorQuestion.id,
      );
      const value = numericAnswer(anchorQuestion, answer?.value ?? null);
      return value !== null && value >= segment.min && value <= segment.max;
    });

    const choiceBreakdowns = choiceQuestions.map((question) => {
      const counts = new Map<string, number>();
      for (const member of members) {
        const answer = member.answers.find(
          (item) => item.questionId === question.id,
        );
        const display = formatAnswerDisplay(
          question,
          answer?.value ?? null,
        ).trim();
        if (!display) continue;
        counts.set(display, (counts.get(display) ?? 0) + 1);
      }

      const memberCount = members.length || 1;
      return {
        questionId: question.id,
        questionLabel: question.label,
        options: [...counts.entries()]
          .map(([label, count]) => ({
            label,
            count,
            percentOfSegment: roundStat((count / memberCount) * 100),
          }))
          .sort((a, b) => b.count - a.count),
      };
    });

    return {
      ...segment,
      count: members.length,
      percentOfTotal: roundStat((members.length / total) * 100),
      choiceBreakdowns,
    };
  });
}

export function buildSegmentAnalysis(
  questions: QuestionInput[],
  submissions: ResponseSubmission[],
) {
  const anchor = findAnchorRangeQuestion(questions);
  if (!anchor) return null;

  const choiceQuestions = questions
    .filter(
      (question) =>
        isChoiceQuestionType(question.type) && question.id !== anchor.id,
    )
    .sort((a, b) => a.order - b.order);

  if (!choiceQuestions.length) return null;

  return {
    anchorQuestionId: anchor.id,
    anchorQuestionLabel: anchor.label,
    segments: buildSegmentCrossTabs({
      anchorQuestion: anchor,
      choiceQuestions,
      submissions,
    }),
  };
}
