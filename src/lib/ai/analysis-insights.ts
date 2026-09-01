import {
  buildAnalysisInsightsContext,
  type AnalysisInsightsContext,
} from "@/domain/analysis-insights-context";
import type {
  ResponseAnalytics,
  ResponseSubmission,
} from "@/domain/response-analytics";
import { generateTextCompletion } from "@/lib/ai/generate-json";
import { normalizeMarkdownReport } from "@/lib/normalize-markdown-report";
import {
  analysisInsightsSchema,
  type AnalysisInsights,
} from "@/lib/validators/analysis-insights";
import type { QuestionInput } from "@/lib/validators/question";

export async function generateAnalysisInsights(input: {
  formTitle: string;
  questions: QuestionInput[];
  submissions: ResponseSubmission[];
  analytics: ResponseAnalytics;
  prompt: string;
}): Promise<AnalysisInsights | null> {
  const context = buildAnalysisInsightsContext(input);

  const userPrompt = `${input.prompt.trim()}

Data survei:
${JSON.stringify(context, null, 2)}`;

  const raw = await generateTextCompletion({
    systemPrompt:
      "Ikuti instruksi pengguna. Jawab dalam Bahasa Indonesia, format Markdown (GFM). Gunakan hanya angka dari data survei; jangan mengarang.",
    userPrompt,
    maxTokens: 16000,
  });

  if (!raw) return null;

  const report = normalizeMarkdownReport(raw);
  const parsed = analysisInsightsSchema.safeParse({ report });
  if (!parsed.success) {
    console.error("analysis insights schema mismatch", parsed.error.flatten());
    return null;
  }

  return parsed.data;
}

export type { AnalysisInsightsContext };
