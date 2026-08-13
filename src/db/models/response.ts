import { Schema, models, model, type InferSchemaType, Types } from "mongoose";

const answerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const responseSchema = new Schema(
  {
    formId: {
      type: Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      index: true,
    },
    submittedAt: { type: Date, default: Date.now, required: true },
    meta: {
      userAgent: String,
      ipHash: String,
    },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: false },
);

responseSchema.index({ formId: 1, submittedAt: -1 });

export type ResponseDocument = InferSchemaType<typeof responseSchema> & {
  _id: Types.ObjectId;
};

export const Response = models.Response || model("Response", responseSchema);
