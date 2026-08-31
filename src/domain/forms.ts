import { createId } from "@paralleldrive/cuid2";
import type { QuestionType } from "@/lib/form-constants";
import { DEFAULT_RANGE_OPTIONS } from "@/lib/range-question";
import { ui } from "@/lib/ui-id";
import {
  isChoiceQuestionType,
  type QuestionInput,
  type SectionInput,
} from "@/lib/validators/question";

/** Used when loading forms created before sections existed. */
export const DEFAULT_SECTION_ID = "default";

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
export function makePublicSlug(): string {
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

export function createSection(order = 0, title = ""): SectionInput {
  return {
    id: createId(),
    title,
    description: "",
    order,
  };
}

export function createQuestion(
  type: QuestionType = "short_text",
  order = 0,
  sectionId: string,
): QuestionInput {
  const base: QuestionInput = {
    id: createId(),
    type,
    label: ui.defaultQuestionLabel,
    helpText: "",
    required: false,
    order,
    sectionId,
  };

  if (isChoiceQuestionType(type)) {
    return {
      ...base,
      options: { choices: createDefaultChoices() },
    };
  }

  if (type === "range") {
    return {
      ...base,
      options: { range: { ...DEFAULT_RANGE_OPTIONS } },
    };
  }

  return base;
}

export function createDefaultQuestion(sectionId = DEFAULT_SECTION_ID) {
  return createQuestion("short_text", 0, sectionId);
}

export function duplicateQuestion(question: QuestionInput): QuestionInput {
  const next: QuestionInput = {
    ...question,
    id: createId(),
  };

  if (question.options?.choices?.length) {
    next.options = {
      ...next.options,
      choices: question.options.choices.map((choice) => ({
        id: createId(),
        label: choice.label,
      })),
    };
  }

  if (question.options?.range) {
    next.options = {
      ...next.options,
      range: { ...question.options.range },
    };
  }

  return next;
}

export function createStarterFormContent(): {
  sections: SectionInput[];
  questions: QuestionInput[];
} {
  const section = createSection(0);
  return {
    sections: [section],
    questions: [createQuestion("short_text", 0, section.id)],
  };
}

export function ensureFormStructure(
  questions: QuestionInput[],
  sections?: SectionInput[] | null,
): { sections: SectionInput[]; questions: QuestionInput[] } {
  const cleanedSections = [...(sections ?? [])]
    .filter((section) => section.id)
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({
      id: section.id,
      title: section.title ?? "",
      description: section.description ?? "",
      order: index,
    }));

  if (cleanedSections.length === 0) {
    const section: SectionInput = {
      id: DEFAULT_SECTION_ID,
      title: "",
      description: "",
      order: 0,
    };
    return normalizeFormStructure(
      [section],
      questions.map((question) => ({
        ...question,
        sectionId: question.sectionId || DEFAULT_SECTION_ID,
      })),
    );
  }

  return normalizeFormStructure(cleanedSections, questions);
}

/** Keep section order, then questions in each section, then reindex `order`. */
export function normalizeFormStructure(
  sections: SectionInput[],
  questions: QuestionInput[],
): { sections: SectionInput[]; questions: QuestionInput[] } {
  const orderedSections = sections.map((section, index) => ({
    ...section,
    title: section.title ?? "",
    description: section.description ?? "",
    order: index,
  }));
  const validIds = new Set(orderedSections.map((section) => section.id));
  const fallbackId = orderedSections[0]?.id ?? DEFAULT_SECTION_ID;

  const grouped = new Map<string, QuestionInput[]>();
  for (const section of orderedSections) {
    grouped.set(section.id, []);
  }

  for (const question of questions) {
    const sectionId =
      question.sectionId && validIds.has(question.sectionId)
        ? question.sectionId
        : fallbackId;
    const bucket = grouped.get(sectionId) ?? grouped.get(fallbackId);
    bucket?.push({ ...question, sectionId });
  }

  const flattened: QuestionInput[] = [];
  for (const section of orderedSections) {
    flattened.push(...(grouped.get(section.id) ?? []));
  }

  return {
    sections: orderedSections,
    questions: flattened.map((question, index) => ({
      ...question,
      order: index,
    })),
  };
}

export type FormPage = {
  section: SectionInput;
  questions: QuestionInput[];
};

export function buildFormPages(
  sections: SectionInput[],
  questions: QuestionInput[],
  options?: { skipEmpty?: boolean },
): FormPage[] {
  const structure = normalizeFormStructure(sections, questions);
  const pages = structure.sections.map((section) => ({
    section,
    questions: structure.questions.filter(
      (question) => question.sectionId === section.id,
    ),
  }));
  if (options?.skipEmpty) {
    const filled = pages.filter((page) => page.questions.length > 0);
    return filled.length > 0 ? filled : pages;
  }
  return pages;
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
  } else if (nextType === "range") {
    next.options = {
      range: question.options?.range ?? { ...DEFAULT_RANGE_OPTIONS },
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
