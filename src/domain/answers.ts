import { createHash } from "crypto";
import type { QuestionInput } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";
import { isFileAnswerValue } from "@/lib/storage/form-uploads";
import { fileAnswerSchema } from "@/lib/validators/response";
import { normalizeRangeValue } from "@/lib/range-question";

export type FileAnswerValue = {
  name: string;
  url: string;
  size: number;
  contentType: string;
  path: string;
};

export type AnswerValue = string | number | string[] | FileAnswerValue | null;

export type AnswerInput = {
  questionId: string;
  value: AnswerValue;
};

export type FieldError = {
  questionId: string;
  message: string;
};

function isBlank(value: AnswerValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object" && "url" in value) {
    return !value.url;
  }
  return false;
}

function choiceIds(question: QuestionInput): Set<string> {
  return new Set((question.options?.choices ?? []).map((c) => c.id));
}

/** Expected storage path for a file uploaded to this form question. */
export function expectedFormUploadPathPrefix(
  formId: string,
  questionId: string,
): string {
  return `form-uploads/${formId}/${questionId}/`;
}

export function isValidFormUploadPath(
  path: string,
  formId: string,
  questionId: string,
): boolean {
  return path.startsWith(expectedFormUploadPathPrefix(formId, questionId));
}

/** Validate submitted answers against the live question schema */
export function validateAnswersAgainstQuestions(
  formId: string,
  questions: QuestionInput[],
  answers: AnswerInput[],
): { ok: true; answers: AnswerInput[] } | { ok: false; errors: FieldError[] } {
  const byId = new Map(answers.map((a) => [a.questionId, a.value]));
  const errors: FieldError[] = [];
  const normalized: AnswerInput[] = [];

  for (const question of questions) {
    const raw = byId.has(question.id) ? byId.get(question.id)! : null;
    let value: AnswerValue = raw ?? null;

    if (question.required && isBlank(value)) {
      errors.push({
        questionId: question.id,
        message: ui.thisRequired,
      });
      continue;
    }

    if (isBlank(value)) {
      normalized.push({ questionId: question.id, value: null });
      continue;
    }

    switch (question.type) {
      case "short_text":
      case "long_text":
      case "date": {
        if (typeof value !== "string") {
          errors.push({
            questionId: question.id,
            message: ui.invalidTextAnswer,
          });
          break;
        }
        value = value.trim();
        if (value.length > 5000) {
          errors.push({
            questionId: question.id,
            message: ui.answerTooLong,
          });
          break;
        }
        normalized.push({ questionId: question.id, value });
        break;
      }
      case "email": {
        if (typeof value !== "string") {
          errors.push({
            questionId: question.id,
            message: ui.invalidEmailShort,
          });
          break;
        }
        value = value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push({
            questionId: question.id,
            message: ui.validEmail,
          });
          break;
        }
        normalized.push({ questionId: question.id, value });
        break;
      }
      case "number": {
        const num =
          typeof value === "number" ? value : Number(String(value).trim());
        if (!Number.isFinite(num)) {
          errors.push({
            questionId: question.id,
            message: ui.validNumber,
          });
          break;
        }
        normalized.push({ questionId: question.id, value: num });
        break;
      }
      case "range": {
        const num = normalizeRangeValue(question, value);
        if (num === null) {
          errors.push({
            questionId: question.id,
            message: ui.validRangeValue,
          });
          break;
        }
        normalized.push({ questionId: question.id, value: num });
        break;
      }
      case "multiple_choice":
      case "dropdown": {
        if (typeof value !== "string" || !choiceIds(question).has(value)) {
          errors.push({
            questionId: question.id,
            message: ui.selectValidOption,
          });
          break;
        }
        normalized.push({ questionId: question.id, value });
        break;
      }
      case "checkboxes": {
        if (!Array.isArray(value)) {
          errors.push({
            questionId: question.id,
            message: ui.selectValidOptions,
          });
          break;
        }
        const allowed = choiceIds(question);
        if (value.some((id) => typeof id !== "string" || !allowed.has(id))) {
          errors.push({
            questionId: question.id,
            message: ui.selectValidOptions,
          });
          break;
        }
        normalized.push({ questionId: question.id, value: [...value] });
        break;
      }
      case "file_upload": {
        const parsed = fileAnswerSchema.safeParse(value);
        if (!parsed.success || !isFileAnswerValue(parsed.data)) {
          errors.push({
            questionId: question.id,
            message: ui.invalidFileAnswer,
          });
          break;
        }
        if (!isValidFormUploadPath(parsed.data.path, formId, question.id)) {
          errors.push({
            questionId: question.id,
            message: ui.invalidFileAnswer,
          });
          break;
        }
        normalized.push({ questionId: question.id, value: parsed.data });
        break;
      }
      default: {
        errors.push({
          questionId: question.id,
          message: ui.unsupportedQuestionType,
        });
      }
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, answers: normalized };
}

export function hashIp(ip: string | null): string | undefined {
  if (!ip) return undefined;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
