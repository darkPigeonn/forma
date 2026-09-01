import { Types } from "mongoose";
import { connectDb } from "@/db/client";
import { AnalysisInsight } from "@/db/models/analysis-insight";
import {
  parseStoredAnalysisInsights,
  type AnalysisInsights,
} from "@/lib/validators/analysis-insights";

export type CachedAnalysisInsights = {
  result: AnalysisInsights;
  generatedAt: string;
  regenerationCount: number;
};

export async function getCachedAnalysisInsights(
  formId: string,
  fingerprint: string,
): Promise<CachedAnalysisInsights | null> {
  await connectDb();
  const doc = await AnalysisInsight.findOne({
    formId: new Types.ObjectId(formId),
  }).lean();

  if (!doc?.result || doc.fingerprint !== fingerprint) return null;

  const parsed = parseStoredAnalysisInsights(doc.result);
  if (!parsed) return null;

  return {
    result: parsed,
    generatedAt: new Date(doc.generatedAt).toISOString(),
    regenerationCount:
      typeof doc.regenerationCount === "number" ? doc.regenerationCount : 0,
  };
}

export async function saveAnalysisInsights(
  formId: string,
  fingerprint: string,
  result: AnalysisInsights,
  options: { isRegeneration?: boolean } = {},
): Promise<number> {
  await connectDb();
  const formObjectId = new Types.ObjectId(formId);
  const existing = await AnalysisInsight.findOne({ formId: formObjectId }).lean();

  let regenerationCount = 0;
  if (
    options.isRegeneration &&
    existing &&
    existing.fingerprint === fingerprint
  ) {
    regenerationCount =
      (typeof existing.regenerationCount === "number"
        ? existing.regenerationCount
        : 0) + 1;
  }

  await AnalysisInsight.findOneAndUpdate(
    { formId: formObjectId },
    {
      $set: {
        fingerprint,
        result,
        regenerationCount,
        generatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return regenerationCount;
}
