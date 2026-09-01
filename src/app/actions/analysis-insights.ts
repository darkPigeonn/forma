"use server";

import { generateAnalysisInsights } from "@/lib/ai/analysis-insights";
import {
  canRegenerateAiInsights,
  remainingAiRegenerations,
} from "@/lib/ai/analysis-insights-limits";
import { isAiConfigured } from "@/lib/ai/generate-json";
import { requireSessionUser } from "@/lib/firebase/auth";
import { getAccessibleFormDetail } from "@/db/queries/forms";
import {
  getAccessibleFormResponseFingerprint,
  getAccessibleFormResponsesBundle,
} from "@/db/queries/responses";
import {
  getCachedAnalysisInsights,
  saveAnalysisInsights,
} from "@/db/queries/analysis-insights";
import { buildAnalysisInsightsFingerprint } from "@/domain/analysis-insights-context";
import { ui } from "@/lib/ui-id";
import { z } from "zod";

const inputSchema = z.object({
  formId: z.string().min(1),
  force: z.boolean().optional(),
  prompt: z.string().trim().min(20).max(4000),
});

export type AnalysisInsightsActionResult =
  | {
      ok: true;
      insights: import("@/lib/validators/analysis-insights").AnalysisInsights;
      generatedAt: string;
      cached: boolean;
      regenerationCount: number;
      regenerationsRemaining: number;
    }
  | {
      ok: false;
      code:
        | "auth"
        | "not_found"
        | "no_responses"
        | "not_configured"
        | "failed"
        | "limit_reached";
      error: string;
    };

export type SavedAnalysisInsightsResult =
  | {
      ok: true;
      insights: import("@/lib/validators/analysis-insights").AnalysisInsights | null;
      generatedAt: string | null;
      regenerationCount: number;
      regenerationsRemaining: number;
    }
  | {
      ok: false;
      code: "auth" | "not_found";
      error: string;
    };

/** Read persisted AI insights only — never calls the AI provider. */
export async function getSavedAnalysisInsightsAction(
  formId: string,
): Promise<SavedAnalysisInsightsResult> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return { ok: false, code: "auth", error: ui.signInRequired };
  }

  if (!formId.trim()) {
    return { ok: false, code: "not_found", error: ui.formNotFound };
  }

  const stats = await getAccessibleFormResponseFingerprint(
    formId,
    user.uid,
    user.email,
  );
  if (!stats) {
    return {
      ok: true,
      insights: null,
      generatedAt: null,
      regenerationCount: 0,
      regenerationsRemaining: remainingAiRegenerations(0),
    };
  }

  const fingerprint = buildAnalysisInsightsFingerprint({
    totalResponses: stats.total,
    lastSubmittedAt: stats.lastSubmittedAt,
  });

  const cached = await getCachedAnalysisInsights(formId, fingerprint);
  if (!cached) {
    return {
      ok: true,
      insights: null,
      generatedAt: null,
      regenerationCount: 0,
      regenerationsRemaining: remainingAiRegenerations(0),
    };
  }

  return {
    ok: true,
    insights: cached.result,
    generatedAt: cached.generatedAt,
    regenerationCount: cached.regenerationCount,
    regenerationsRemaining: remainingAiRegenerations(cached.regenerationCount),
  };
}

export async function getAnalysisInsightsAction(
  input: unknown,
): Promise<AnalysisInsightsActionResult> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return { ok: false, code: "auth", error: ui.signInRequired };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "failed", error: ui.invalidRequest };
  }

  const { formId, force = false, prompt } = parsed.data;

  const form = await getAccessibleFormDetail(formId, user.uid, user.email);
  if (!form) {
    return { ok: false, code: "not_found", error: ui.formNotFound };
  }

  const bundle = await getAccessibleFormResponsesBundle(
    formId,
    user.uid,
    user.email,
  );
  if (!bundle || bundle.total === 0) {
    return { ok: false, code: "no_responses", error: ui.noResponsesYet };
  }

  const lastSubmittedAt =
    bundle.analytics.overview.lastSubmittedAt ??
    bundle.items[0]?.submittedAt ??
    null;
  const fingerprint = buildAnalysisInsightsFingerprint({
    totalResponses: bundle.total,
    lastSubmittedAt,
  });

  if (!isAiConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      error: ui.analysisAiNotConfigured,
    };
  }

  const cached = await getCachedAnalysisInsights(formId, fingerprint);

  if (!force) {
    if (cached) {
      return {
        ok: true,
        insights: cached.result,
        generatedAt: cached.generatedAt,
        cached: true,
        regenerationCount: cached.regenerationCount,
        regenerationsRemaining: remainingAiRegenerations(
          cached.regenerationCount,
        ),
      };
    }
  } else if (cached && !canRegenerateAiInsights(cached.regenerationCount)) {
    return {
      ok: false,
      code: "limit_reached",
      error: ui.analysisAiRegenerationLimit,
    };
  }

  const insights = await generateAnalysisInsights({
    formTitle: form.title,
    questions: form.questions,
    submissions: bundle.submissions,
    analytics: bundle.analytics,
    prompt,
  });

  if (!insights) {
    return { ok: false, code: "failed", error: ui.analysisAiFailed };
  }

  const regenerationCount = await saveAnalysisInsights(
    formId,
    fingerprint,
    insights,
    { isRegeneration: force && Boolean(cached) },
  );
  const generatedAt = new Date().toISOString();

  return {
    ok: true,
    insights,
    generatedAt,
    cached: false,
    regenerationCount,
    regenerationsRemaining: remainingAiRegenerations(regenerationCount),
  };
}
