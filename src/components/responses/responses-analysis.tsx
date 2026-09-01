"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  buildResponseAnalytics,
  type ResponseSubmission,
} from "@/domain/response-analytics";
import type { TextSentiment } from "@/domain/text-sentiment";
import type { FormDetail } from "@/db/queries/forms";
import {
  SurveyBarChart,
  SurveyDonutChart,
  SurveyWordCloud,
} from "@/components/responses/survey-charts";
import { ui } from "@/lib/ui-id";
import type { QuestionInput } from "@/lib/validators/question";

type ResponsesAnalysisProps = {
  form: Pick<FormDetail, "id" | "title" | "status" | "publicPath">;
  questions: QuestionInput[];
  submissions: ResponseSubmission[];
};

export function ResponsesAnalysis({
  form,
  questions,
  submissions,
}: ResponsesAnalysisProps) {
  const [copied, setCopied] = useState(false);

  const analytics = useMemo(
    () => buildResponseAnalytics(questions, submissions),
    [questions, submissions],
  );

  const { scales, choices, texts } = analytics;
  const scaleById = useMemo(
    () => new Map(scales.map((item) => [item.questionId, item])),
    [scales],
  );
  const choiceById = useMemo(
    () => new Map(choices.map((item) => [item.questionId, item])),
    [choices],
  );
  const textById = useMemo(
    () => new Map(texts.map((item) => [item.questionId, item])),
    [texts],
  );

  const orderedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.order - b.order),
    [questions],
  );

  async function shareReport() {
    const lines = [
      ui.analysisShareTitle(form.title),
      "",
      ...scales.map(
        (scale) =>
          `${scale.label}: ${ui.analysisAverage} ${scale.average} (${scale.answered} ${ui.analysisResponsesLabel})`,
      ),
      ...texts.map(
        (text) =>
          `${text.label}: ${text.answered} ${ui.analysisResponsesLabel} (${text.responseRate}%)`,
      ),
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div id="survey-analytics" className="survey-analytics space-y-6">
      <header className="rounded-xl border border-border bg-bg-elevated p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ink sm:text-2xl">
                {form.title}
              </h2>
              <StatusBadge status={form.status} />
            </div>
            <p className="text-sm text-ink-muted">{ui.analysisPerQuestionSubtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <a
              href={`/api/forms/${form.id}/responses/export`}
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-bg-elevated px-3 text-sm font-medium hover:border-ink-muted"
            >
              {ui.exportCsv}
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center rounded-xl border border-border bg-bg-elevated px-3 text-sm font-medium hover:border-ink-muted"
            >
              {ui.analysisExportPdf}
            </button>
            <button
              type="button"
              onClick={() => void shareReport()}
              className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
            >
              {copied ? ui.copied : ui.analysisShareReport}
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {orderedQuestions.map((question, index) => {
          const scale = scaleById.get(question.id);
          if (scale) {
            return (
              <QuestionAnalysisCard
                key={question.id}
                index={index + 1}
                title={question.label}
                meta={ui.analysisScaleStats(
                  scale.average,
                  scale.median,
                  scale.answered,
                )}
                badge={`${ui.analysisAverage}: ${scale.average}`}
              >
                <SurveyBarChart summary={scale.distribution} />
              </QuestionAnalysisCard>
            );
          }

          const choice = choiceById.get(question.id);
          if (choice) {
            return (
              <QuestionAnalysisCard
                key={question.id}
                index={index + 1}
                title={question.label}
                meta={ui.analysisChoiceResponses(choice.options.reduce((s, o) => s + o.count, 0))}
              >
                <SurveyDonutChart summary={choice} />
              </QuestionAnalysisCard>
            );
          }

          const text = textById.get(question.id);
          if (text) {
            return (
              <QuestionAnalysisCard
                key={question.id}
                index={index + 1}
                title={question.label}
                meta={ui.analysisTextStats(
                  text.answered,
                  text.skipped,
                  text.responseRate,
                )}
                scrollable
              >
                <div className="space-y-4">
                  <SentimentSummary sentiment={text.sentiment} />
                  {text.topWords.length > 0 ? (
                    <SurveyWordCloud words={text.topWords} />
                  ) : null}
                  {text.samples.length > 0 ? (
                    <ul className="grid gap-3 lg:grid-cols-2">
                      {text.samples.map((sample, sampleIndex) => (
                        <li
                          key={`${question.id}-${sampleIndex}`}
                          className="rounded-xl border border-border/80 bg-bg-elevated p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <SentimentBadge sentiment={sample.sentiment} />
                            <span
                              className="max-w-[60%] truncate text-right text-xs font-medium text-ink"
                              title={sample.respondentLabel}
                            >
                              {sample.respondentLabel}
                            </span>
                          </div>
                          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-ink">
                            {sample.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm italic text-ink-muted">{ui.noAnswer}</p>
                  )}
                </div>
              </QuestionAnalysisCard>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: FormDetail["status"] }) {
  const label =
    status === "published" ? ui.live : status === "closed" ? ui.closed : ui.draft;
  const className =
    status === "published"
      ? "bg-accent/10 text-accent"
      : status === "closed"
        ? "bg-border text-ink-muted"
        : "bg-border/70 text-ink-muted";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function QuestionAnalysisCard({
  index,
  title,
  meta,
  badge,
  scrollable = false,
  children,
}: {
  index: number;
  title: string;
  meta: string;
  badge?: string;
  scrollable?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={`rounded-xl border border-border bg-bg-elevated p-4 shadow-sm shadow-black/[0.03] sm:p-5 ${
        scrollable ? "flex max-h-[min(32rem,70vh)] flex-col" : ""
      }`}
    >
      <div className="mb-4 flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            {ui.questionN(index)}
          </p>
          <h3 className="font-medium text-ink">{title}</h3>
          <p className="text-sm text-ink-muted">{meta}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            {badge}
          </span>
        ) : null}
      </div>
      <div
        className={
          scrollable ? "min-h-0 flex-1 overflow-y-auto overscroll-contain" : ""
        }
      >
        {children}
      </div>
    </article>
  );
}

function SentimentSummary({
  sentiment,
}: {
  sentiment: Record<TextSentiment, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <SentimentBadge sentiment="positive" count={sentiment.positive} />
      <SentimentBadge sentiment="neutral" count={sentiment.neutral} />
      <SentimentBadge sentiment="negative" count={sentiment.negative} />
    </div>
  );
}

function SentimentBadge({
  sentiment,
  count,
}: {
  sentiment: TextSentiment;
  count?: number;
}) {
  const config = {
    positive: {
      label: ui.sentimentPositive,
      className: "bg-success/10 text-success",
    },
    neutral: {
      label: ui.sentimentNeutral,
      className: "bg-border text-ink-muted",
    },
    negative: {
      label: ui.sentimentNegative,
      className: "bg-danger/10 text-danger",
    },
  }[sentiment];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
      {typeof count === "number" ? (
        <span className="tabular-nums">({count})</span>
      ) : null}
    </span>
  );
}
