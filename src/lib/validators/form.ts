import { z } from "zod";
import {
  FORM_STATUSES,
  FORM_THEME_IDS,
  UNIQUE_BY_MODES,
} from "@/lib/form-constants";

export const formIdSchema = z.string().min(1);

export const createFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .optional(),
  templateId: z.string().min(1).optional(),
});

export const renameFormSchema = z.object({
  formId: formIdSchema,
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title is too long"),
});

export const formIdOnlySchema = z.object({
  formId: formIdSchema,
});

export const setFormStatusSchema = z.object({
  formId: formIdSchema,
  status: z.enum(FORM_STATUSES),
});

export const updateFormMetaSchema = z.object({
  formId: formIdSchema,
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  confirmationMessage: z.string().trim().min(1).max(1000).optional(),
  themeId: z.enum(FORM_THEME_IDS).optional(),
  limitOneResponse: z.boolean().optional(),
  uniqueBy: z.enum(UNIQUE_BY_MODES).optional(),
});
