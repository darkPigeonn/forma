import { Schema, models, model, type InferSchemaType } from "mongoose";
import { FORM_STATUSES, QUESTION_TYPES } from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";

export { FORM_STATUSES, QUESTION_TYPES } from "@/lib/form-constants";
export type { FormStatus, QuestionType } from "@/lib/form-constants";

const choiceSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    label: { type: String, required: true },
    helpText: { type: String, default: "" },
    required: { type: Boolean, default: false },
    order: { type: Number, required: true },
    options: {
      type: {
        choices: { type: [choiceSchema], default: [] },
      },
      required: false,
    },
  },
  { _id: false },
);

const formSchema = new Schema(
  {
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: ui.untitledForm },
    description: { type: String, default: "" },
    slug: { type: String, sparse: true, unique: true },
    /** Compact share code for `/f/{shortCode}` (legacy long slugs still resolve). */
    shortCode: { type: String, sparse: true, unique: true },
    status: {
      type: String,
      enum: FORM_STATUSES,
      default: "draft",
      required: true,
    },
    confirmationMessage: {
      type: String,
      default: ui.defaultConfirmation,
    },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true },
);

formSchema.index({ ownerId: 1, updatedAt: -1 });

export type FormDocument = InferSchemaType<typeof formSchema> & {
  _id: Schema.Types.ObjectId;
};

export const Form = models.Form || model("Form", formSchema);
