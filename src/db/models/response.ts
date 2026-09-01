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
      type: new Schema(
        {
          userAgent: String,
          ipHash: String,
          respondentKey: String,
          uniqueKey: String,
          respondentEmail: String,
          respondentUid: String,
        },
        { _id: false, minimize: true },
      ),
      default: undefined,
    },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: false },
);

responseSchema.index({ formId: 1, submittedAt: -1 });
responseSchema.index(
  { formId: 1, "meta.respondentKey": 1 },
  { unique: true, sparse: true },
);
responseSchema.index(
  { formId: 1, "meta.uniqueKey": 1 },
  { unique: true, sparse: true },
);
responseSchema.index({ formId: 1, "meta.respondentEmail": 1 }, { sparse: true });

export type ResponseDocument = InferSchemaType<typeof responseSchema> & {
  _id: Types.ObjectId;
};

export const Response = models.Response || model("Response", responseSchema);
