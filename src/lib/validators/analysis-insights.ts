import { z } from "zod";

export const analysisInsightsSchema = z.object({
  report: z.string().min(200),
});

export type AnalysisInsights = z.infer<typeof analysisInsightsSchema>;

const legacyInsightsSchema = z.object({
  overview: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  questions: z
    .array(
      z.object({
        questionId: z.string(),
        insight: z.string(),
      }),
    )
    .optional(),
});

/** Accept new `report` format or migrate older cached payloads. */
export function parseStoredAnalysisInsights(
  raw: unknown,
): AnalysisInsights | null {
  const current = analysisInsightsSchema.safeParse(raw);
  if (current.success) return current.data;

  const legacy = legacyInsightsSchema.safeParse(raw);
  if (!legacy.success) return null;

  const parts: string[] = [];
  if (legacy.data.overview) parts.push(legacy.data.overview);
  if (legacy.data.highlights?.length) {
    parts.push(
      "",
      "Temuan utama:",
      ...legacy.data.highlights.map((item) => `• ${item}`),
    );
  }
  if (legacy.data.recommendations?.length) {
    parts.push(
      "",
      "Rekomendasi:",
      ...legacy.data.recommendations.map((item) => `• ${item}`),
    );
  }
  if (legacy.data.questions?.length) {
    parts.push("", "Per pertanyaan:");
    for (const item of legacy.data.questions) {
      parts.push("", item.insight);
    }
  }

  const report = parts.join("\n").trim();
  if (report.length < 200) return null;

  return { report };
}
