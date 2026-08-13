import { z } from "zod";
import { QUESTION_TYPES } from "@/lib/form-constants";
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

export const questionSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(QUESTION_TYPES),
    label: z.string().trim().min(1, ui.questionLabelRequired).max(500),
    helpText: z.string().max(1000).optional().default(""),
    required: z.boolean(),
    order: z.number().int().min(0),
    options: z
      .object({
        choices: z.array(choiceOptionSchema).min(1, ui.atLeastOneOption),
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
  });

export const questionsArraySchema = z
  .array(questionSchema)
  .min(1, ui.atLeastOneQuestion);

export const saveFormQuestionsSchema = z.object({
  formId: z.string().min(1),
  questions: questionsArraySchema,
});

export type QuestionInput = z.infer<typeof questionSchema>;
