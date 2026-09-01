import { buildSegmentAnalysis } from "@/domain/analysis-segments";
import type {
  ResponseAnalytics,
  ResponseSubmission,
} from "@/domain/response-analytics";
import { formatAnswerDisplay } from "@/domain/responses";
import type { QuestionInput } from "@/lib/validators/question";

const MAX_TEXT_SAMPLES = 12;
const MAX_TEXT_CHARS = 280;

function truncate(text: string, max = MAX_TEXT_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export type AnalysisInsightsContext = {
  formTitle: string;
  totalResponses: number;
  completionRate: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  coverage: Array<{
    questionId: string;
    label: string;
    answered: number;
    skipped: number;
    responseRate: number;
  }>;
  questions: Array<Record<string, unknown>>;
  segmentAnalysis: ReturnType<typeof buildSegmentAnalysis>;
};

export function buildAnalysisInsightsContext(input: {
  formTitle: string;
  questions: QuestionInput[];
  submissions: ResponseSubmission[];
  analytics: ResponseAnalytics;
}): AnalysisInsightsContext {
  const { formTitle, questions, submissions, analytics } = input;
  const ordered = [...questions].sort((a, b) => a.order - b.order);
  const total = analytics.overview.total;

  const scaleById = new Map(
    analytics.scales.map((item) => [item.questionId, item]),
  );
  const choiceById = new Map(
    analytics.choices.map((item) => [item.questionId, item]),
  );
  const textById = new Map(
    analytics.texts.map((item) => [item.questionId, item]),
  );

  const coverage = ordered.map((question) => {
    const scale = scaleById.get(question.id);
    if (scale) {
      return {
        questionId: question.id,
        label: question.label,
        answered: scale.answered,
        skipped: total - scale.answered,
        responseRate: total ? Math.round((scale.answered / total) * 1000) / 10 : 0,
      };
    }
    const choice = choiceById.get(question.id);
    if (choice) {
      const answered = choice.options.reduce((sum, option) => sum + option.count, 0);
      return {
        questionId: question.id,
        label: question.label,
        answered,
        skipped: total - answered,
        responseRate: total ? Math.round((answered / total) * 1000) / 10 : 0,
      };
    }
    const text = textById.get(question.id);
    if (text) {
      return {
        questionId: question.id,
        label: question.label,
        answered: text.answered,
        skipped: text.skipped,
        responseRate: text.responseRate,
      };
    }
    return {
      questionId: question.id,
      label: question.label,
      answered: 0,
      skipped: total,
      responseRate: 0,
    };
  });

  const questionPayload = ordered.map((question, index) => {
    const base = {
      questionNumber: index + 1,
      questionId: question.id,
      label: question.label,
      type: question.type,
    };

    const scale = scaleById.get(question.id);
    if (scale) {
      const modeOption = [...scale.distribution.options].sort(
        (a, b) => b.count - a.count,
      )[0];
      return {
        ...base,
        answered: scale.answered,
        average: scale.average,
        median: scale.median,
        mode: modeOption?.label ?? null,
        min: scale.min,
        max: scale.max,
        distribution: scale.distribution.options.map((option) => ({
          label: option.label,
          count: option.count,
          percent: option.percent,
        })),
      };
    }

    const choice = choiceById.get(question.id);
    if (choice) {
      return {
        ...base,
        answered: choice.options.reduce((sum, option) => sum + option.count, 0),
        uniqueOptions: choice.options.length,
        options: choice.options.map((option) => ({
          label: option.label,
          count: option.count,
          percent: option.percent,
        })),
      };
    }

    const text = textById.get(question.id);
    if (text) {
      const samples: string[] = [];
      for (const submission of submissions) {
        if (samples.length >= MAX_TEXT_SAMPLES) break;
        const answer = submission.answers.find(
          (item) => item.questionId === question.id,
        );
        const display = truncate(
          formatAnswerDisplay(question, answer?.value ?? null),
        );
        if (display) samples.push(display);
      }

      return {
        ...base,
        answered: text.answered,
        skipped: text.skipped,
        responseRate: text.responseRate,
        sampleAnswers: samples,
      };
    }

    if (question.type === "number") {
      const numberStats = analytics.numbers.find(
        (item) => item.questionId === question.id,
      );
      if (numberStats) {
        return {
          ...base,
          answered: numberStats.answered,
          average: numberStats.average,
          median: numberStats.median,
          min: numberStats.min,
          max: numberStats.max,
        };
      }
    }

    return base;
  });

  return {
    formTitle,
    totalResponses: total,
    completionRate: analytics.overview.completionRate,
    dateRange: {
      from: analytics.overview.firstSubmittedAt,
      to: analytics.overview.lastSubmittedAt,
    },
    coverage,
    questions: questionPayload,
    segmentAnalysis: buildSegmentAnalysis(ordered, submissions),
  };
}

export function buildAnalysisInsightsFingerprint(input: {
  totalResponses: number;
  lastSubmittedAt: string | null;
}): string {
  return `${input.totalResponses}:${input.lastSubmittedAt ?? "none"}`;
}
