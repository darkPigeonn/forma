import { z } from "zod";
import { FILE_UPLOAD_MAX_BYTES } from "@/lib/form-constants";

const storedFileUrlSchema = z.union([
  z.string().url(),
  z.string().regex(/^s3:\/\/.+/),
]);

export const fileAnswerSchema = z.object({
  name: z.string().min(1).max(255),
  url: storedFileUrlSchema,
  size: z.number().int().positive().max(FILE_UPLOAD_MAX_BYTES),
  contentType: z.string().min(1).max(200),
  path: z.string().min(1).max(500),
});

export const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.array(z.string()),
  fileAnswerSchema,
  z.null(),
]);

export const submitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: answerValueSchema,
      }),
    )
    .default([]),
  respondentIdToken: z.string().min(1).optional(),
});
