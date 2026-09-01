"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  buildResponseAnalytics,
  type ResponseSubmission,
} from "@/domain/response-analytics";
import type { FormDetail } from "@/db/queries/forms";
import { AnalysisAiPanel } from "@/components/responses/analysis-ai-panel";
import {
  SurveyBarChart,
  SurveyDonutChart,
  SurveyWordCloud,
} from "@/components/responses/survey-charts";
import type { AnalysisInsights } from "@/lib/validators/analysis-insights";
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
  const [aiInsights, setAiInsights] = useState<AnalysisInsights | null>(null);

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
      aiInsights?.report ?? "",
    ];

    if (!aiInsights?.report) {
      lines.push(
        "",
        ...scales.map(
          (scale) =>
            `${scale.label}: ${ui.analysisAverage} ${scale.average} (${scale.answered} ${ui.analysisResponsesLabel})`,
        ),
      );
    }

    try {
      await navigator.clipboard.writeText(lines.filter(Boolean).join("\n"));
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
            <p className="text-sm text-ink-muted">{ui.analysisInsightsSubtitle}</p>
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

      <AnalysisAiPanel formId={form.id} onInsightsChange={setAiInsights} />

      <div className="space-y-4">
        <p className="text-sm text-ink-muted">{ui.analysisQualitativeHint}</p>
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
                meta={ui.analysisChoiceResponses(
                  choice.options.reduce((s, o) => s + o.count, 0),
                )}
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
                  {text.topWords.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                        {ui.analysisQualitative}
                      </p>
                      <SurveyWordCloud words={text.topWords} />
                    </div>
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
        scrollable ? "flex max-h-[min(32rem,70vh)] flex-col" : "space-y-4"
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
          scrollable
            ? "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain"
            : "space-y-4"
        }
      >
        {children}
      </div>
    </article>
  );
}
