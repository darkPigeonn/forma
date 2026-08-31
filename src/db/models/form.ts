import { Schema, models, model, type InferSchemaType } from "mongoose";
import {
  DEFAULT_FORM_THEME_ID,
  FORM_STATUSES,
  FORM_THEME_IDS,
  QUESTION_TYPES,
  type QuestionType,
} from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";

export { FORM_STATUSES, QUESTION_TYPES } from "@/lib/form-constants";
export type { FormStatus, QuestionType } from "@/lib/form-constants";

/** Plain array so Mongoose enum accepts every current question type. */
const QUESTION_TYPE_VALUES = [...QUESTION_TYPES] as QuestionType[];

const choiceSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const rangeSchema = new Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    minLabel: { type: String, default: "" },
    maxLabel: { type: String, default: "" },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPE_VALUES, required: true },
    label: { type: String, required: true },
    helpText: { type: String, default: "" },
    required: { type: Boolean, default: false },
    order: { type: Number, required: true },
    sectionId: { type: String, required: false },
    options: {
      type: {
        choices: { type: [choiceSchema], default: [] },
        range: { type: rangeSchema, required: false },
      },
      required: false,
    },
  },
  { _id: false },
);

const sectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    order: { type: Number, required: true },
  },
  { _id: false },
);

const headerImageSchema = new Schema(
  {
    path: { type: String, required: true },
    url: { type: String, required: true },
    contentType: { type: String, required: true },
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
    themeId: {
      type: String,
      enum: FORM_THEME_IDS,
      default: DEFAULT_FORM_THEME_ID,
    },
    /** When true, the same browser may submit only once (cookie + respondent key). */
    limitOneResponse: { type: Boolean, default: false },
    uniqueBy: {
      type: String,
      enum: ["browser", "phone", "email"],
      default: "browser",
    },
    uniqueQuestionId: { type: String, default: null },
    headerImage: { type: headerImageSchema, default: null },
    questions: { type: [questionSchema], default: [] },
    sections: { type: [sectionSchema], default: [] },
  },
  { timestamps: true },
);

formSchema.index({ ownerId: 1, updatedAt: -1 });

export type FormDocument = InferSchemaType<typeof formSchema> & {
  _id: Schema.Types.ObjectId;
};

const FORM_MODEL_NAME = "Form";

/** Resolve the Form model (re-registers in dev so schema/enum edits apply). */
export function getFormModel() {
  if (process.env.NODE_ENV !== "production" && models[FORM_MODEL_NAME]) {
    delete models[FORM_MODEL_NAME];
  }
  return models[FORM_MODEL_NAME] || model(FORM_MODEL_NAME, formSchema);
}

/** Prefer `getFormModel()` in server code paths that run during Next.js HMR. */
export const Form = getFormModel();
