"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import {
  getAnalysisInsightsAction,
  getSavedAnalysisInsightsAction,
} from "@/app/actions/analysis-insights";
import { AnalysisReportView } from "@/components/responses/analysis-report-view";
import { formatDateTime } from "@/lib/format-date";
import type { AnalysisInsights } from "@/lib/validators/analysis-insights";
import { ui } from "@/lib/ui-id";

const MAX_PROMPT_LENGTH = 4000;
const MIN_PROMPT_LENGTH = 20;

type AnalysisAiPanelProps = {
  formId: string;
  onInsightsChange?: (insights: AnalysisInsights | null) => void;
};

function AnalysisAiPromptField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const isValid = value.trim().length >= MIN_PROMPT_LENGTH;

  return (
    <details className="group rounded-lg border border-border bg-bg-elevated/80">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span>{ui.analysisAiPromptSummary}</span>
        <span
          className="shrink-0 text-ink-muted transition-transform group-open:rotate-180"
          aria-hidden
        >
          ▾
        </span>
      </summary>
      <div className="space-y-1.5 border-t border-border px-4 py-4">
        <label htmlFor={id} className="sr-only">
          {ui.analysisAiPromptLabel}
        </label>
        <p className="text-xs text-ink-muted">{ui.analysisAiPromptHint}</p>
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={ui.analysisAiPromptPlaceholder}
          rows={8}
          maxLength={MAX_PROMPT_LENGTH}
          disabled={disabled}
          className="w-full resize-y rounded-md border border-border bg-bg-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p
            className={
              isValid || value.length === 0
                ? "text-ink-muted"
                : "text-danger"
            }
          >
            {isValid || value.length === 0
              ? null
              : ui.analysisAiPromptRequired}
          </p>
          <p className="text-ink-muted">
            {value.length}/{MAX_PROMPT_LENGTH}
          </p>
        </div>
      </div>
    </details>
  );
}

export function AnalysisAiPanel({
  formId,
  onInsightsChange,
}: AnalysisAiPanelProps) {
  const promptFieldId = useId();
  const [prompt, setPrompt] = useState("");
  const [insights, setInsights] = useState<AnalysisInsights | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [regenerationsRemaining, setRegenerationsRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isCheckingSaved, setIsCheckingSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  const promptValid = prompt.trim().length >= MIN_PROMPT_LENGTH;

  const applyInsights = useCallback(
    (
      next: AnalysisInsights | null,
      at: string | null,
      remaining: number,
    ) => {
      setInsights(next);
      onInsightsChange?.(next);
      setGeneratedAt(at);
      setRegenerationsRemaining(remaining);
    },
    [onInsightsChange],
  );

  useEffect(() => {
    let cancelled = false;

    async function checkSaved() {
      setIsCheckingSaved(true);
      try {
        const result = await getSavedAnalysisInsightsAction(formId);
        if (cancelled) return;

        if (!result.ok) {
          setError(result.error);
          setErrorCode(result.code);
          applyInsights(null, null, 0);
          return;
        }

        if (result.insights) {
          applyInsights(
            result.insights,
            result.generatedAt,
            result.regenerationsRemaining,
          );
        } else {
          applyInsights(null, null, result.regenerationsRemaining);
        }
      } catch {
        if (!cancelled) {
          setError(ui.analysisAiNetworkError);
          setErrorCode("failed");
          applyInsights(null, null, 0);
        }
      } finally {
        if (!cancelled) setIsCheckingSaved(false);
      }
    }

    void checkSaved();
    return () => {
      cancelled = true;
    };
  }, [formId, applyInsights]);

  const generate = useCallback(
    (force = false) => {
      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt.length < MIN_PROMPT_LENGTH) {
        setError(ui.analysisAiPromptRequired);
        setErrorCode("failed");
        return;
      }

      setError(null);
      setErrorCode(null);
      startTransition(async () => {
        try {
          const result = await getAnalysisInsightsAction({
            formId,
            force,
            prompt: trimmedPrompt,
          });
          if (!result.ok) {
            if (!insights) {
              applyInsights(null, null, 0);
            }
            setError(result.error);
            setErrorCode(result.code);
            return;
          }
          applyInsights(
            result.insights,
            result.generatedAt,
            result.regenerationsRemaining,
          );
        } catch {
          setError(ui.analysisAiNetworkError);
          setErrorCode("failed");
        }
      });
    },
    [formId, applyInsights, insights, prompt],
  );

  const generateButton = (force: boolean, className: string) => (
    <button
      type="button"
      onClick={() => generate(force)}
      disabled={isPending || !promptValid}
      className={className}
    >
      {isPending
        ? ui.analysisAiGenerating
        : force
          ? ui.analysisAiRegenerate
          : ui.analysisAiGenerate}
    </button>
  );

  if (isCheckingSaved) {
    return (
      <section
        className="w-full rounded-xl border border-border bg-bg-elevated p-5 sm:p-6"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-border/70" />
          <div className="h-4 w-full animate-pulse rounded bg-border/60" />
        </div>
      </section>
    );
  }

  if (!insights) {
    if (isPending) {
      return (
        <section
          className="w-full rounded-xl border border-border bg-bg-elevated p-5 sm:p-6"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-border/70" />
            <div className="h-4 w-full animate-pulse rounded bg-border/60" />
            <div className="h-4 w-full animate-pulse rounded bg-border/60" />
            <p className="text-sm text-ink-muted">{ui.analysisAiGenerating}</p>
          </div>
        </section>
      );
    }

    if (error) {
      return (
        <section
          className={`w-full space-y-4 rounded-xl border p-5 sm:p-6 ${
            errorCode === "not_configured"
              ? "border-border bg-bg-elevated"
              : "border-danger/30 bg-danger/5"
          }`}
          role="alert"
        >
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-ink">
              {ui.analysisAiTitle}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">{error}</p>
          </div>
          {errorCode !== "not_configured" ? (
            <>
              <AnalysisAiPromptField
                id={promptFieldId}
                value={prompt}
                onChange={setPrompt}
              />
              <div className="flex justify-end">
                {generateButton(
                  false,
                  "inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60",
                )}
              </div>
            </>
          ) : null}
        </section>
      );
    }

    return (
      <section className="w-full space-y-4 rounded-xl border border-border bg-bg-elevated p-5 sm:p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ink">
              {ui.analysisAiTitle}
            </h2>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              AI
            </span>
          </div>
          <p className="text-sm text-ink-muted">{ui.analysisAiGenerateHint}</p>
        </div>
        <AnalysisAiPromptField
          id={promptFieldId}
          value={prompt}
          onChange={setPrompt}
        />
        <div className="flex justify-end print:hidden">
          {generateButton(
            false,
            "inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60",
          )}
        </div>
      </section>
    );
  }

  const canRegenerate = regenerationsRemaining > 0;

  return (
    <section className="w-full rounded-xl border border-accent/20 bg-gradient-to-br from-accent/[0.06] via-bg-elevated to-bg-elevated p-5 shadow-sm shadow-black/[0.03] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ink">
              {ui.analysisAiTitle}
            </h2>
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              AI
            </span>
          </div>
          <p className="text-sm text-ink-muted">{ui.analysisAiSubtitle}</p>
          {generatedAt ? (
            <p className="text-xs text-ink-muted">
              {ui.analysisAiGeneratedAt(formatDateTime(generatedAt))}
            </p>
          ) : null}
          {canRegenerate ? (
            <p className="text-xs font-medium text-accent">
              {ui.analysisAiRegenerationsLeft(regenerationsRemaining)}
            </p>
          ) : (
            <p className="text-xs text-ink-muted">
              {ui.analysisAiRegenerationLimit}
            </p>
          )}
        </div>
      </div>

      {canRegenerate ? (
        <div className="mt-4 space-y-3 print:hidden">
          <AnalysisAiPromptField
            id={`${promptFieldId}-regen`}
            value={prompt}
            onChange={setPrompt}
            disabled={isPending}
          />
          <div className="flex justify-end">
            {generateButton(
              true,
              "inline-flex min-h-11 items-center rounded-md border border-border bg-bg-elevated px-4 text-sm font-medium hover:border-ink-muted disabled:opacity-60",
            )}
          </div>
        </div>
      ) : null}

      {error && errorCode === "limit_reached" ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {isPending ? (
        <div className="mt-5 space-y-3" aria-busy="true">
          <div className="h-4 w-full animate-pulse rounded bg-border/60" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-border/60" />
          <p className="text-sm text-ink-muted">{ui.analysisAiGenerating}</p>
        </div>
      ) : (
        <AnalysisReportView report={insights.report} />
      )}
    </section>
  );
}
