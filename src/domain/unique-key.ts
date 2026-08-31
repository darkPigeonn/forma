import type { AnswerInput, AnswerValue } from "@/domain/answers";
import { createQuestion } from "@/domain/forms";
import type { UniqueByMode } from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("62") && digits.length >= 10) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.startsWith("8") && digits.length >= 9) {
    digits = `0${digits}`;
  }
  return digits;
}

export function isLikelyPhoneQuestion(question: QuestionInput): boolean {
  const label = question.label.toLowerCase();
  return /hp|handphone|telepon|telp|whatsapp|\bwa\b|phone|nomor/.test(label);
}

export function isLikelyNameQuestion(question: QuestionInput): boolean {
  const label = question.label.toLowerCase();
  return /nama|name/.test(label);
}

export function findUniqueQuestion(
  questions: QuestionInput[],
  uniqueBy: UniqueByMode,
  uniqueQuestionId?: string | null,
): QuestionInput | undefined {
  if (uniqueBy === "browser") return undefined;
  if (uniqueQuestionId) {
    const match = questions.find((q) => q.id === uniqueQuestionId);
    if (match) return match;
  }
  if (uniqueBy === "email") {
    return questions.find((q) => q.type === "email");
  }
  return questions.find((q) => isLikelyPhoneQuestion(q));
}

export function applyUniqueQuestion(
  questions: QuestionInput[],
  sections: SectionInput[],
  uniqueBy: UniqueByMode,
): { questions: QuestionInput[]; uniqueQuestionId: string | null } {
  if (uniqueBy === "browser") {
    return { questions, uniqueQuestionId: null };
  }

  const existing = findUniqueQuestion(questions, uniqueBy, null);
  if (existing) {
    return {
      questions: questions.map((q) =>
        q.id === existing.id ? { ...q, required: true } : q,
      ),
      uniqueQuestionId: existing.id,
    };
  }

  const sectionId = sections[0]?.id ?? questions[0]?.sectionId;
  if (!sectionId) {
    return { questions, uniqueQuestionId: null };
  }

  const type = uniqueBy === "email" ? "email" : "short_text";
  const added = createQuestion(type, questions.length, sectionId);
  added.label =
    uniqueBy === "email" ? ui.templateEmailLabel : ui.templatePhoneLabel;
  added.required = true;
  added.helpText =
    uniqueBy === "email" ? ui.uniqueEmailHelp : ui.uniquePhoneHelp;

  return {
    questions: [...questions, added],
    uniqueQuestionId: added.id,
  };
}

export function answerToText(value: AnswerValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && "name" in value) return value.name;
  return "";
}

export function uniqueKeyFromAnswers(
  uniqueBy: UniqueByMode | null | undefined,
  uniqueQuestionId: string | null | undefined,
  questions: QuestionInput[],
  answers: AnswerInput[],
): { ok: true; key: string | null } | { ok: false; questionId: string; message: string } {
  if (!uniqueBy || uniqueBy === "browser") {
    return { ok: true, key: null };
  }

  const question = findUniqueQuestion(questions, uniqueBy, uniqueQuestionId);
  if (!question) {
    return { ok: true, key: null };
  }

  const answer = answers.find((a) => a.questionId === question.id);
  const raw = answerToText(answer?.value ?? null);
  if (!raw) {
    return {
      ok: false,
      questionId: question.id,
      message: ui.thisRequired,
    };
  }

  const key =
    uniqueBy === "email" ? normalizeEmail(raw) : normalizePhone(raw);

  if (uniqueBy === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
    return { ok: false, questionId: question.id, message: ui.validEmail };
  }
  if (uniqueBy === "phone" && key.length < 9) {
    return { ok: false, questionId: question.id, message: ui.validPhone };
  }

  return { ok: true, key };
}
