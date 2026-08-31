import type { AnswerValue } from "@/domain/answers";
import {
  buildChoiceSummaries,
  formatAnswerDisplay,
  type ChoiceQuestionSummary,
} from "@/domain/responses";
import {
  analyzeSentiment,
  extractTopWords,
  type TextSentiment,
} from "@/domain/text-sentiment";
import type { QuestionInput } from "@/lib/validators/question";
import { isChoiceQuestionType } from "@/lib/validators/question";
import {
  buildRangeDistribution,
  normalizeRangeValue,
} from "@/lib/range-question";

const TEXT_QUESTION_TYPES = new Set<QuestionInput["type"]>([
  "short_text",
  "long_text",
  "email",
]);

export type ResponseSubmission = {
  id: string;
  submittedAt: string;
  respondentLabel: string;
  answers: Array<{ questionId: string; value: AnswerValue }>;
};

export type ScaleQuestionStats = {
  questionId: string;
  label: string;
  average: number;
  median: number;
  min: number;
  max: number;
  answered: number;
  distribution: ChoiceQuestionSummary;
};

export type NumberQuestionStats = {
  questionId: string;
  label: string;
  average: number;
  median: number;
  min: number;
  max: number;
  answered: number;
};

export type TextQuestionSample = {
  text: string;
  submittedAt: string;
  sentiment: TextSentiment;
};

export type TextQuestionStats = {
  questionId: string;
  label: string;
  type: QuestionInput["type"];
  answered: number;
  skipped: number;
  responseRate: number;
  sentiment: Record<TextSentiment, number>;
  topWords: Array<{ word: string; count: number }>;
  samples: TextQuestionSample[];
};

export type ResponseAnalytics = {
  overview: {
    total: number;
    completionRate: number;
    csatScore: number | null;
    firstSubmittedAt: string | null;
    lastSubmittedAt: string | null;
  };
  scales: ScaleQuestionStats[];
  numbers: NumberQuestionStats[];
  choices: ChoiceQuestionSummary[];
  texts: TextQuestionStats[];
};

function parseScaleLabel(label: string): number | null {
  const trimmed = label.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function isScaleQuestion(question: QuestionInput): boolean {
  if (!isChoiceQuestionType(question.type)) return false;
  const choices = question.options?.choices ?? [];
  if (choices.length < 2) return false;
  return choices.every((choice) => parseScaleLabel(choice.label) !== null);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function roundStat(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function scaleValueFromAnswer(
  question: QuestionInput,
  value: AnswerValue,
): number | null {
  if (typeof value !== "string") return null;
  const choice = question.options?.choices?.find((item) => item.id === value);
  if (!choice) return null;
  return parseScaleLabel(choice.label);
}

function numberFromAnswer(value: AnswerValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function numericStats(values: number[]) {
  if (!values.length) {
    return { average: 0, median: 0, min: 0, max: 0, answered: 0 };
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    average: roundStat(sum / values.length),
    median: roundStat(median(values)),
    min: Math.min(...values),
    max: Math.max(...values),
    answered: values.length,
  };
}

function buildScaleStats(
  question: QuestionInput,
  distribution: ChoiceQuestionSummary,
  responses: ResponseSubmission[],
): ScaleQuestionStats {
  const values: number[] = [];
  for (const response of responses) {
    const answer = response.answers.find((item) => item.questionId === question.id);
    if (!answer) continue;
    const value = scaleValueFromAnswer(question, answer.value);
    if (value !== null) values.push(value);
  }
  const stats = numericStats(values);
  return {
    questionId: question.id,
    label: question.label,
    ...stats,
    distribution,
  };
}

function buildRangeStats(
  question: QuestionInput,
  responses: ResponseSubmission[],
  total: number,
): ScaleQuestionStats {
  const distribution = buildRangeDistribution(question, responses, total);
  const values: number[] = [];
  for (const response of responses) {
    const answer = response.answers.find((item) => item.questionId === question.id);
    if (!answer) continue;
    const value = normalizeRangeValue(question, answer.value);
    if (value !== null) values.push(value);
  }
  const stats = numericStats(values);
  return {
    questionId: question.id,
    label: question.label,
    ...stats,
    distribution,
  };
}

function buildNumberStats(
  question: QuestionInput,
  responses: ResponseSubmission[],
): NumberQuestionStats | null {
  const values: number[] = [];
  for (const response of responses) {
    const answer = response.answers.find((item) => item.questionId === question.id);
    if (!answer) continue;
    const value = numberFromAnswer(answer.value);
    if (value !== null) values.push(value);
  }
  if (!values.length) return null;
  return {
    questionId: question.id,
    label: question.label,
    ...numericStats(values),
  };
}

function buildTextStats(
  question: QuestionInput,
  responses: ResponseSubmission[],
  total: number,
): TextQuestionStats {
  const samples: TextQuestionSample[] = [];
  const allTexts: string[] = [];
  const sentiment: Record<TextSentiment, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  let answered = 0;

  for (const response of responses) {
    const answer = response.answers.find((item) => item.questionId === question.id);
    const display = formatAnswerDisplay(question, answer?.value ?? null).trim();
    if (!display) continue;
    answered += 1;
    allTexts.push(display);
    const tone = analyzeSentiment(display);
    sentiment[tone] += 1;
    if (samples.length < 8) {
      samples.push({ text: display, submittedAt: response.submittedAt, sentiment: tone });
    }
  }

  return {
    questionId: question.id,
    label: question.label,
    type: question.type,
    answered,
    skipped: Math.max(total - answered, 0),
    responseRate: total ? roundStat((answered / total) * 100, 1) : 0,
    sentiment,
    topWords: extractTopWords(allTexts),
    samples,
  };
}

function computeCompletionRate(
  questions: QuestionInput[],
  responses: ResponseSubmission[],
): number {
  const required = questions.filter((question) => question.required);
  if (!required.length || !responses.length) return 100;

  let complete = 0;
  for (const response of responses) {
    const done = required.every((question) => {
      const answer = response.answers.find((item) => item.questionId === question.id);
      return Boolean(
        formatAnswerDisplay(question, answer?.value ?? null).trim(),
      );
    });
    if (done) complete += 1;
  }

  return roundStat((complete / responses.length) * 100, 1);
}

export function buildResponseAnalytics(
  questions: QuestionInput[],
  responses: ResponseSubmission[],
): ResponseAnalytics {
  const total = responses.length;
  const sortedByDate = [...responses].sort((a, b) =>
    a.submittedAt.localeCompare(b.submittedAt),
  );

  const choiceSummaries = buildChoiceSummaries(questions, responses);
  const summaryByQuestionId = new Map(
    choiceSummaries.map((summary) => [summary.questionId, summary]),
  );

  const scales: ScaleQuestionStats[] = [];
  const choices: ChoiceQuestionSummary[] = [];

  for (const question of questions) {
    if (question.type === "range") {
      scales.push(buildRangeStats(question, responses, total));
      continue;
    }
    if (!isChoiceQuestionType(question.type)) continue;
    const distribution = summaryByQuestionId.get(question.id);
    if (!distribution) continue;
    if (isScaleQuestion(question)) {
      scales.push(buildScaleStats(question, distribution, responses));
    } else {
      choices.push(distribution);
    }
  }

  const numbers = questions
    .filter((question) => question.type === "number")
    .map((question) => buildNumberStats(question, responses))
    .filter((item): item is NumberQuestionStats => item !== null);

  const texts = questions
    .filter((question) => TEXT_QUESTION_TYPES.has(question.type))
    .map((question) => buildTextStats(question, responses, total));

  const primaryScale = scales[0];

  return {
    overview: {
      total,
      completionRate: computeCompletionRate(questions, responses),
      csatScore: primaryScale ? primaryScale.average : null,
      firstSubmittedAt: sortedByDate[0]?.submittedAt ?? null,
      lastSubmittedAt: sortedByDate[sortedByDate.length - 1]?.submittedAt ?? null,
    },
    scales,
    numbers,
    choices,
    texts,
  };
}
