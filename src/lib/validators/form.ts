import { z } from "zod";
import { FORM_STATUSES } from "@/lib/form-constants";

export const formIdSchema = z.string().min(1);

export const createFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title is too long")
    .optional(),
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
});
