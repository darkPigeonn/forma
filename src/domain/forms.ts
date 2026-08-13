import { createId } from "@paralleldrive/cuid2";
import type { QuestionType } from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";
import {
  isChoiceQuestionType,
  type QuestionInput,
} from "@/lib/validators/question";

/** Unambiguous alphabet for short public links (no 0/1/i/l/o). */
const SHORT_LINK_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** URL-safe slug base from a title */
export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || "form";
}

/** Compact share code for `/f/{code}` (default 8 chars). */
export function makeShortLinkCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SHORT_LINK_ALPHABET[bytes[i]! % SHORT_LINK_ALPHABET.length];
  }
  return out;
}

/** @deprecated Prefer makeShortLinkCode — kept for call-site compatibility */
export function makePublicSlug(_title?: string): string {
  return makeShortLinkCode();
}

export function isShortLinkCode(value: string): boolean {
  return /^[23456789abcdefghjkmnpqrstuvwxyz]{6,12}$/.test(value);
}

/** Preferred public path segment: shortCode, else legacy slug. */
export function publicShareCode(doc: {
  shortCode?: string | null;
  slug?: string | null;
}): string | null {
  return doc.shortCode || doc.slug || null;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  ...ui.questionTypes,
};

export function createDefaultChoices() {
  return [
    { id: createId(), label: ui.optionPrefix(1) },
    { id: createId(), label: ui.optionPrefix(2) },
  ];
}

export function createQuestion(
  type: QuestionType = "short_text",
  order = 0,
): QuestionInput {
  const base: QuestionInput = {
    id: createId(),
    type,
    label: ui.defaultQuestionLabel,
    helpText: "",
    required: false,
    order,
  };

  if (isChoiceQuestionType(type)) {
    return {
      ...base,
      options: { choices: createDefaultChoices() },
    };
  }

  return base;
}

export function createDefaultQuestion() {
  return createQuestion("short_text", 0);
}

/** Keep options in sync when the question type changes */
export function applyQuestionType(
  question: QuestionInput,
  nextType: QuestionType,
): QuestionInput {
  const next: QuestionInput = {
    ...question,
    type: nextType,
  };

  if (isChoiceQuestionType(nextType)) {
    next.options = {
      choices:
        question.options?.choices?.length
          ? question.options.choices
          : createDefaultChoices(),
    };
  } else {
    delete next.options;
  }

  return next;
}

export function normalizeQuestionOrder(
  questions: QuestionInput[],
): QuestionInput[] {
  return questions.map((q, index) => ({ ...q, order: index }));
}
