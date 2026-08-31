import { z } from "zod";
import { MAX_FORM_SECTIONS, QUESTION_TYPES } from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";

export const CHOICE_QUESTION_TYPES = [
  "multiple_choice",
  "checkboxes",
  "dropdown",
] as const;

export type ChoiceQuestionType = (typeof CHOICE_QUESTION_TYPES)[number];

export function isChoiceQuestionType(
  type: string,
): type is ChoiceQuestionType {
  return (CHOICE_QUESTION_TYPES as readonly string[]).includes(type);
}

export const choiceOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, ui.optionLabelRequired).max(200),
});

export const rangeOptionSchema = z.object({
  min: z.number().int(ui.validRangeBounds),
  max: z.number().int(ui.validRangeBounds),
  minLabel: z.string().max(100).optional().default(""),
  maxLabel: z.string().max(100).optional().default(""),
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).optional().default(""),
  description: z.string().max(2000).optional().default(""),
  order: z.number().int().min(0),
});

export const questionSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(QUESTION_TYPES),
    label: z.string().trim().max(500),
    helpText: z.string().max(1000).optional().default(""),
    required: z.boolean(),
    order: z.number().int().min(0),
    sectionId: z.string().min(1),
    options: z
      .object({
        choices: z.array(choiceOptionSchema).min(1, ui.atLeastOneOption).optional(),
        range: rangeOptionSchema.optional(),
      })
      .optional(),
  })
  .superRefine((question, ctx) => {
    if (isChoiceQuestionType(question.type)) {
      if (!question.options?.choices?.length) {
        ctx.addIssue({
          code: "custom",
          message: ui.choiceNeedsOption,
          path: ["options", "choices"],
        });
      }
    }
    if (question.type === "range") {
      const range = question.options?.range;
      if (!range) {
        ctx.addIssue({
          code: "custom",
          message: ui.rangeNeedsBounds,
          path: ["options", "range"],
        });
        return;
      }
      if (range.max <= range.min) {
        ctx.addIssue({
          code: "custom",
          message: ui.validRangeBounds,
          path: ["options", "range", "max"],
        });
      }
      if (range.max - range.min > 20) {
        ctx.addIssue({
          code: "custom",
          message: ui.rangeTooWide,
          path: ["options", "range", "max"],
        });
      }
    }
  });

export const questionsArraySchema = z
  .array(questionSchema)
  .min(1, ui.atLeastOneQuestion);

export const saveFormQuestionsSchema = z
  .object({
    formId: z.string().min(1),
    questions: questionsArraySchema,
    sections: z
      .array(sectionSchema)
      .min(1, ui.atLeastOneSection)
      .max(MAX_FORM_SECTIONS, ui.maxSectionsReached),
  })
  .superRefine((data, ctx) => {
    const ids = data.sections.map((section) => section.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: ui.duplicateSectionIds,
        path: ["sections"],
      });
    }
    const idSet = new Set(ids);
    data.questions.forEach((question, index) => {
      if (!idSet.has(question.sectionId)) {
        ctx.addIssue({
          code: "custom",
          message: ui.questionNeedsSection,
          path: ["questions", index, "sectionId"],
        });
      }
    });
  });

export type QuestionInput = z.infer<typeof questionSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
