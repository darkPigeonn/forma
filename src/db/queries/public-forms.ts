import { connectDb } from "@/db/client";
import { getFormModel } from "@/db/models/form";
import {
  DEFAULT_SECTION_ID,
  ensureFormStructure,
  publicShareCode,
} from "@/domain/forms";
import {
  DEFAULT_FORM_THEME_ID,
  isUniqueByMode,
  type FormThemeId,
  type UniqueByMode,
} from "@/lib/form-constants";
import { isFormThemeId } from "@/lib/form-theme";
import { fromPersistedQuestionOptions } from "@/lib/question-options";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";
import {
  resolveFormHeaderImage,
  type FormHeaderImageMeta,
} from "@/lib/storage/form-header";

export type { FormHeaderImageMeta };

export type PublicFormView = {
  id: string;
  title: string;
  description: string;
  status: "published" | "closed";
  confirmationMessage: string;
  themeId: FormThemeId;
  limitOneResponse: boolean;
  uniqueBy: UniqueByMode;
  uniqueQuestionId: string | null;
  headerImage: FormHeaderImageMeta | null;
  /** Preferred public path segment (short code when available). */
  slug: string;
  questions: QuestionInput[];
  sections: SectionInput[];
};

function serializeQuestions(
  questions: Array<{
    id: string;
    type: string;
    label: string;
    helpText?: string | null;
    required?: boolean | null;
    order?: number | null;
    sectionId?: string | null;
    options?: { choices?: { id: string; label: string }[] } | null;
  }> | undefined,
): QuestionInput[] {
  return (questions ?? []).map((q, index) => {
    const base: QuestionInput = {
      id: q.id,
      type: q.type as QuestionInput["type"],
      label: q.label,
      helpText: q.helpText ?? "",
      required: Boolean(q.required),
      order: typeof q.order === "number" ? q.order : index,
      sectionId: q.sectionId || DEFAULT_SECTION_ID,
    };

    const options = fromPersistedQuestionOptions(q.options);
    if (options) {
      base.options = options;
    }

    return base;
  });
}

function serializeSections(
  sections: Array<{
    id: string;
    title?: string | null;
    description?: string | null;
    order?: number | null;
  }> | undefined,
): SectionInput[] {
  return (sections ?? []).map((section, index) => ({
    id: section.id,
    title: section.title ?? "",
    description: section.description ?? "",
    order: typeof section.order === "number" ? section.order : index,
  }));
}

/** Load a form by public slug or short code. Draft/missing → null. Closed still returned for messaging. */
export async function getPublicFormBySlug(
  slug: string,
): Promise<PublicFormView | null> {
  await connectDb();
  const form = await getFormModel().findOne({
    status: { $in: ["published", "closed"] },
    $or: [{ slug }, { shortCode: slug }],
  })
    .select({
      title: 1,
      description: 1,
      status: 1,
      confirmationMessage: 1,
      slug: 1,
      shortCode: 1,
      questions: 1,
      sections: 1,
      themeId: 1,
      limitOneResponse: 1,
      uniqueBy: 1,
      uniqueQuestionId: 1,
      headerImage: 1,
    })
    .lean();

  if (!form) return null;
  const share = publicShareCode(form);
  if (!share) return null;

  const structure = ensureFormStructure(
    serializeQuestions(form.questions),
    serializeSections(form.sections),
  );

  return {
    id: String(form._id),
    title: form.title,
    description: form.description ?? "",
    status: form.status as "published" | "closed",
    confirmationMessage:
      form.confirmationMessage ?? ui.defaultConfirmation,
    themeId: isFormThemeId(form.themeId) ? form.themeId : DEFAULT_FORM_THEME_ID,
    limitOneResponse: Boolean(form.limitOneResponse),
    uniqueBy: isUniqueByMode(form.uniqueBy) ? form.uniqueBy : "browser",
    uniqueQuestionId: form.uniqueQuestionId ?? null,
    headerImage: await resolveFormHeaderImage(form.headerImage),
    slug: share,
    questions: structure.questions,
    sections: structure.sections,
  };
}
