import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const analysisInsightSchema = new Schema(
  {
    formId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    fingerprint: { type: String, required: true },
    result: { type: Schema.Types.Mixed, required: true },
    regenerationCount: { type: Number, default: 0, required: true },
    generatedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: false },
);

export type AnalysisInsightDocument = InferSchemaType<
  typeof analysisInsightSchema
> & {
  _id: Types.ObjectId;
};

export const AnalysisInsight =
  models.AnalysisInsight || model("AnalysisInsight", analysisInsightSchema);
