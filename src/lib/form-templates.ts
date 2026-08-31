import { createId } from "@paralleldrive/cuid2";
import { createQuestion, createSection } from "@/domain/forms";
import { ui } from "@/lib/ui-id";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";

export const FORM_TEMPLATE_IDS = [
  "event_rsvp",
  "short_census",
  "event_feedback",
] as const;

export type FormTemplateId = (typeof FORM_TEMPLATE_IDS)[number];

export type FormTemplate = {
  id: FormTemplateId;
  title: string;
  description: string;
  confirmationMessage: string;
  uniqueBy: "phone" | "email" | "browser";
  sections: SectionInput[];
  questions: QuestionInput[];
  uniqueQuestionId: string | null;
};

function buildTemplate(
  id: FormTemplateId,
  title: string,
  description: string,
  confirmationMessage: string,
  uniqueBy: FormTemplate["uniqueBy"],
  sectionTitle: string,
  specs: Array<{
    type: QuestionInput["type"];
    label: string;
    required: boolean;
    helpText?: string;
    unique?: boolean;
    choices?: string[];
  }>,
): FormTemplate {
  const section = createSection(0, sectionTitle);
  const questions: QuestionInput[] = specs.map((spec, index) => {
    const question = createQuestion(spec.type, index, section.id);
    question.label = spec.label;
    question.required = spec.required;
    question.helpText = spec.helpText ?? "";
    if (spec.choices?.length && question.options) {
      question.options = {
        choices: spec.choices.map((label) => ({ id: createId(), label })),
      };
    }
    return question;
  });
  const uniqueIndex = specs.findIndex((s) => s.unique);
  return {
    id,
    title,
    description,
    confirmationMessage,
    uniqueBy,
    sections: [section],
    questions,
    uniqueQuestionId:
      uniqueIndex >= 0 ? questions[uniqueIndex]?.id ?? null : null,
  };
}

export const FORM_TEMPLATES: FormTemplate[] = [
  buildTemplate(
    "event_rsvp",
    ui.templateEventTitle,
    ui.templateEventDescription,
    ui.templateEventConfirmation,
    "phone",
    ui.templateEventSection,
    [
      { type: "short_text", label: ui.templateNameLabel, required: true },
      {
        type: "short_text",
        label: ui.templatePhoneLabel,
        required: true,
        unique: true,
        helpText: ui.uniquePhoneHelp,
      },
      { type: "short_text", label: ui.templateWilayahLabel, required: false },
      {
        type: "multiple_choice",
        label: ui.templateAttendLabel,
        required: true,
        choices: [ui.templateAttendYes, ui.templateAttendNo],
      },
    ],
  ),
  buildTemplate(
    "short_census",
    ui.templateCensusTitle,
    ui.templateCensusDescription,
    ui.templateCensusConfirmation,
    "phone",
    ui.templateCensusSection,
    [
      { type: "short_text", label: ui.templateNameLabel, required: true },
      {
        type: "short_text",
        label: ui.templatePhoneLabel,
        required: true,
        unique: true,
        helpText: ui.uniquePhoneHelp,
      },
      { type: "short_text", label: ui.templateWilayahLabel, required: true },
      { type: "email", label: ui.templateEmailLabel, required: false },
    ],
  ),
  buildTemplate(
    "event_feedback",
    ui.templateFeedbackTitle,
    ui.templateFeedbackDescription,
    ui.templateFeedbackConfirmation,
    "browser",
    ui.templateFeedbackSection,
    [
      { type: "short_text", label: ui.templateNameLabel, required: false },
      {
        type: "dropdown",
        label: ui.templateRatingLabel,
        required: true,
        choices: ["5", "4", "3", "2", "1"],
      },
      { type: "long_text", label: ui.templateCommentLabel, required: false },
    ],
  ),
];

export function getFormTemplate(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((template) => template.id === id);
}
