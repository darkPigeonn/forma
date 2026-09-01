import {
  buildAnalysisInsightsContext,
  type AnalysisInsightsContext,
} from "@/domain/analysis-insights-context";
import type {
  ResponseAnalytics,
  ResponseSubmission,
} from "@/domain/response-analytics";
import { generateTextCompletion } from "@/lib/ai/generate-json";
import { SURVEY_REPORT_STYLE_GUIDE } from "@/lib/ai/survey-report-style";
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
}): Promise<AnalysisInsights | null> {
  const context = buildAnalysisInsightsContext(input);
  const userPrompt = `Bantu saya membaca hasil survey ini dengan sistematik dan sesuai data yg kami kumpulkan ini dan siap di presentasikan.

Data survei:
${JSON.stringify(context, null, 2)}

${SURVEY_REPORT_STYLE_GUIDE}`;

  const raw = await generateTextCompletion({
    systemPrompt:
      "Anda menyusun laporan analisis survei pastoral yang siap dipresentasikan: naratif, berbasis angka, jujur tentang batasan data. Output Markdown (GFM) saja.",
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
