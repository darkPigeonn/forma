import type { QuestionInput } from "@/lib/validators/question";
import type { ChoiceQuestionSummary } from "@/domain/responses";
import { ui } from "@/lib/ui-id";

export type RangeQuestionOptions = {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
};

export const DEFAULT_RANGE_OPTIONS: RangeQuestionOptions = {
  min: 1,
  max: 10,
  minLabel: "",
  maxLabel: "",
};

export function isRangeQuestionType(type: string): type is "range" {
  return type === "range";
}

export function getRangeOptions(question: QuestionInput): RangeQuestionOptions {
  const range = question.options?.range;
  if (
    range &&
    Number.isFinite(range.min) &&
    Number.isFinite(range.max) &&
    range.max > range.min
  ) {
    return {
      min: Math.trunc(range.min),
      max: Math.trunc(range.max),
      minLabel: range.minLabel ?? "",
      maxLabel: range.maxLabel ?? "",
    };
  }
  return { ...DEFAULT_RANGE_OPTIONS };
}

export function rangeValues(min: number, max: number): number[] {
  const values: number[] = [];
  for (let value = min; value <= max; value += 1) {
    values.push(value);
  }
  return values;
}

export function normalizeRangeValue(
  question: QuestionInput,
  value: unknown,
): number | null {
  const { min, max } = getRangeOptions(question);
  const num =
    typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(num)) return null;
  const rounded = Math.trunc(num);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

export function buildRangeDistribution(
  question: QuestionInput,
  responses: Array<{
    answers: Array<{ questionId: string; value: unknown }>;
  }>,
  total: number,
): ChoiceQuestionSummary {
  const { min, max } = getRangeOptions(question);
  const counts = new Map(
    rangeValues(min, max).map((value) => [String(value), 0]),
  );

  for (const response of responses) {
    const answer = response.answers.find((item) => item.questionId === question.id);
    const value = normalizeRangeValue(question, answer?.value);
    if (value === null) continue;
    const key = String(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const options = rangeValues(min, max).map((value) => {
    const label = String(value);
    const count = counts.get(label) ?? 0;
    return {
      id: label,
      label,
      count,
      percent: total ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });

  return {
    questionId: question.id,
    label: question.label,
    type: "range",
    options,
  };
}

export function rangeOptionSummary(options: RangeQuestionOptions): string {
  const minLabel = options.minLabel.trim();
  const maxLabel = options.maxLabel.trim();
  if (minLabel || maxLabel) {
    return ui.rangeSummaryWithLabels(
      options.min,
      options.max,
      minLabel || String(options.min),
      maxLabel || String(options.max),
    );
  }
  return ui.rangeSummary(options.min, options.max);
}
