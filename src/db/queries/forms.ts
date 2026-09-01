import { createId } from "@paralleldrive/cuid2";
import { connectDb } from "@/db/client";
import { getFormModel, type FormDocument } from "@/db/models/form";
import { FormCollaborator } from "@/db/models/form-collaborator";
import { Response } from "@/db/models/response";
import {
  createStarterFormContent,
  DEFAULT_SECTION_ID,
  ensureFormStructure,
  isShortLinkCode,
  makeShortLinkCode,
  publicShareCode,
} from "@/domain/forms";
import { ui } from "@/lib/ui-id";
import {
  DEFAULT_FORM_THEME_ID,
  type FormThemeId,
  type UniqueByMode,
} from "@/lib/form-constants";
import { getFormTemplate } from "@/lib/form-templates";
import { applyUniqueQuestion } from "@/domain/unique-key";
import { isFormThemeId } from "@/lib/form-theme";
import type { PublicFormCacheIdentity } from "@/lib/cache/public-form";
import {
  fromPersistedQuestionOptions,
  toPersistedQuestionOptions,
} from "@/lib/question-options";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";
import {
  getEditableForm,
  getOwnedFormDocument,
  listCollaboratedFormIds,
  resolveFormAccess,
} from "@/db/queries/form-access";
import type { FormDoc } from "@/db/queries/form-access";
import type { FormAccessRole } from "@/domain/collaborators";
import type { FormHeaderImageMeta } from "@/lib/storage/form-header";
import {
  deleteFormHeaderImage,
  isFormHeaderPath,
  resolveFormHeaderImage,
  uploadFormHeaderImage,
} from "@/lib/storage/form-header";

export type { FormHeaderImageMeta };

export type FormListItem = {
  id: string;
  title: string;
  status: FormDocument["status"];
  slug: string | null;
  shortCode: string | null;
  publicPath: string | null;
  questionCount: number;
  updatedAt: string;
  createdAt: string;
  accessRole: FormAccessRole;
  ownerId: string;
};

export type FormDetail = FormListItem & {
  description: string;
  confirmationMessage: string;
  themeId: FormThemeId;
  limitOneResponse: boolean;
  collectRespondentEmail: boolean;
  uniqueBy: UniqueByMode;
  uniqueQuestionId: string | null;
  headerImage: FormHeaderImageMeta | null;
  questions: QuestionInput[];
  sections: SectionInput[];
};

async function allocateUniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeShortLinkCode();
    const exists = await getFormModel().exists({
      $or: [{ slug: code }, { shortCode: code }],
    });
    if (!exists) return code;
  }
  throw new Error(ui.couldNotCreateShortLink);
}

/** Ensure form has a short share code; returns true if document was mutated. */
async function ensureShortLinkOnForm(form: FormDocument): Promise<boolean> {
  if (form.shortCode) return false;

  if (form.slug && isShortLinkCode(form.slug)) {
    form.shortCode = form.slug;
    return true;
  }

  const code = await allocateUniqueShortCode();
  form.shortCode = code;
  if (!form.slug) {
    form.slug = code;
  }
  return true;
}

function serializeQuestions(questions: FormDocument["questions"] | undefined): QuestionInput[] {
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
  sections: FormDocument["sections"] | undefined,
): SectionInput[] {
  return (sections ?? []).map((section, index) => ({
    id: section.id,
    title: section.title ?? "",
    description: section.description ?? "",
    order: typeof section.order === "number" ? section.order : index,
  }));
}

function toListItem(
  doc: {
    _id: { toString(): string } | string;
    title: string;
    status: FormDocument["status"];
    slug?: string | null;
    shortCode?: string | null;
    questions?: unknown[];
    updatedAt: Date | string;
    createdAt: Date | string;
    ownerId?: string;
  },
  access: { accessRole: FormAccessRole; ownerId: string },
): FormListItem {
  const share = publicShareCode(doc);
  return {
    id: String(doc._id),
    title: doc.title,
    status: doc.status,
    slug: doc.slug ?? null,
    shortCode: doc.shortCode ?? null,
    publicPath: share ? `/f/${share}` : null,
    questionCount: doc.questions?.length ?? 0,
    updatedAt: new Date(doc.updatedAt).toISOString(),
    createdAt: new Date(doc.createdAt).toISOString(),
    accessRole: access.accessRole,
    ownerId: access.ownerId,
  };
}

function toDetail(
  doc: FormDocument,
  access: { accessRole: FormAccessRole; ownerId: string },
): FormDetail {
  const item = toListItem(doc, access);
  const structure = ensureFormStructure(
    serializeQuestions(doc.questions),
    serializeSections(doc.sections),
  );
  return {
    ...item,
    description: doc.description ?? "",
    confirmationMessage:
      doc.confirmationMessage ?? ui.defaultConfirmation,
    themeId: isFormThemeId(doc.themeId) ? doc.themeId : DEFAULT_FORM_THEME_ID,
    limitOneResponse: Boolean(doc.limitOneResponse),
    collectRespondentEmail: Boolean(doc.collectRespondentEmail),
    uniqueBy:
      doc.uniqueBy === "phone" || doc.uniqueBy === "email"
        ? doc.uniqueBy
        : "browser",
    uniqueQuestionId: doc.uniqueQuestionId ?? null,
    headerImage: null,
    questions: structure.questions,
    sections: structure.sections,
  };
}

async function toDetailAsync(
  doc: FormDocument,
  access: { accessRole: FormAccessRole; ownerId: string },
): Promise<FormDetail> {
  const base = toDetail(doc, access);
  base.headerImage = await resolveFormHeaderImage(doc.headerImage);
  return base;
}

async function backfillShortLinkIfNeeded(form: FormDoc): Promise<void> {
  if (
    (form.status === "published" || form.status === "closed") &&
    (form.slug || form.shortCode)
  ) {
    const changed = await ensureShortLinkOnForm(form);
    if (changed) await form.save();
  }
}

export async function listFormsForUser(
  userId: string,
  email: string,
): Promise<FormListItem[]> {
  await connectDb();
  const collaboratedIds = await listCollaboratedFormIds(userId, email);

  const ownedDocs = await getFormModel()
    .find({ ownerId: userId })
    .sort({ updatedAt: -1 });
  const collaboratedDocs = collaboratedIds.length
    ? await getFormModel()
        .find({ _id: { $in: collaboratedIds } })
        .sort({ updatedAt: -1 })
    : [];

  for (const form of [...ownedDocs, ...collaboratedDocs]) {
    await backfillShortLinkIfNeeded(form);
  }

  const owned = ownedDocs.map((doc) =>
    toListItem(doc, { accessRole: "owner", ownerId: userId }),
  );
  const ownedIds = new Set(owned.map((form) => form.id));
  const shared = collaboratedDocs
    .filter((doc) => !ownedIds.has(String(doc._id)))
    .map((doc) =>
      toListItem(doc, {
        accessRole: "editor",
        ownerId: String(doc.ownerId),
      }),
    );

  return [...owned, ...shared].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** @deprecated Use listFormsForUser */
export async function listFormsForOwner(ownerId: string): Promise<FormListItem[]> {
  return listFormsForUser(ownerId, "");
}

export async function getOwnedForm(formId: string, ownerId: string) {
  return getOwnedFormDocument(formId, ownerId);
}

export async function getOwnedFormDetail(
  formId: string,
  ownerId: string,
): Promise<FormDetail | null> {
  const form = await getOwnedFormDocument(formId, ownerId);
  if (!form) return null;
  await backfillShortLinkIfNeeded(form);
  return toDetailAsync(form, { accessRole: "owner", ownerId });
}

export async function getAccessibleFormDetail(
  formId: string,
  userId: string,
  email: string,
): Promise<FormDetail | null> {
  const access = await resolveFormAccess(formId, userId, email);
  if (!access) return null;
  await backfillShortLinkIfNeeded(access.form);
  return toDetailAsync(access.form, {
    accessRole: access.role,
    ownerId: access.form.ownerId,
  });
}

export async function createFormForOwner(
  ownerId: string,
  title?: string,
): Promise<FormDetail> {
  await connectDb();
  const starter = createStarterFormContent();
  const form = await getFormModel().create({
    ownerId,
    title: title ?? ui.untitledForm,
    description: "",
    status: "draft",
    questions: starter.questions,
    sections: starter.sections,
  });
  return toDetailAsync(form, { accessRole: "owner", ownerId });
}

export async function createFormFromTemplateForOwner(
  ownerId: string,
  templateId: string,
): Promise<FormDetail | null> {
  const template = getFormTemplate(templateId);
  if (!template) return null;
  await connectDb();
  const form = await getFormModel().create({
    ownerId,
    title: template.title,
    description: template.description,
    confirmationMessage: template.confirmationMessage,
    status: "draft",
    questions: template.questions,
    sections: template.sections,
    limitOneResponse: template.uniqueBy !== "browser",
    uniqueBy: template.uniqueBy,
    uniqueQuestionId: template.uniqueQuestionId,
  });
  return toDetailAsync(form, { accessRole: "owner", ownerId });
}

export async function renameOwnedForm(
  formId: string,
  userId: string,
  email: string,
  title: string,
): Promise<FormDetail | null> {
  const form = await getEditableForm(formId, userId, email);
  if (!form) return null;
  form.title = title;
  await form.save();
  const access = await resolveFormAccess(formId, userId, email);
  if (!access) return null;
  return toDetailAsync(form, {
    accessRole: access.role,
    ownerId: form.ownerId,
  });
}

export async function updateOwnedFormMeta(
  formId: string,
  userId: string,
  email: string,
  patch: {
    title?: string;
    description?: string;
    confirmationMessage?: string;
    themeId?: FormThemeId;
    limitOneResponse?: boolean;
    collectRespondentEmail?: boolean;
    uniqueBy?: UniqueByMode;
  },
): Promise<FormDetail | null> {
  const form = await getEditableForm(formId, userId, email);
  if (!form) return null;
  if (patch.title !== undefined) form.title = patch.title;
  if (patch.description !== undefined) form.description = patch.description;
  if (patch.confirmationMessage !== undefined) {
    form.confirmationMessage = patch.confirmationMessage;
  }
  if (patch.themeId !== undefined) form.themeId = patch.themeId;
  if (patch.limitOneResponse !== undefined) {
    form.limitOneResponse = patch.limitOneResponse;
  }
  if (patch.collectRespondentEmail !== undefined) {
    form.collectRespondentEmail = patch.collectRespondentEmail;
  }
  if (patch.uniqueBy !== undefined) {
    form.uniqueBy = patch.uniqueBy;
    const structure = ensureFormStructure(
      serializeQuestions(form.questions),
      serializeSections(form.sections),
    );
    const applied = applyUniqueQuestion(
      structure.questions,
      structure.sections,
      patch.uniqueBy,
    );
    form.questions = applied.questions as FormDocument["questions"];
    form.uniqueQuestionId = applied.uniqueQuestionId;
    if (patch.uniqueBy !== "browser") {
      form.limitOneResponse = true;
    }
  }
  await form.save();
  const access = await resolveFormAccess(formId, userId, email);
  if (!access) return null;
  return toDetailAsync(form, {
    accessRole: access.role,
    ownerId: form.ownerId,
  });
}

export async function duplicateOwnedForm(
  formId: string,
  ownerId: string,
): Promise<FormDetail | null> {
  const source = await getOwnedFormDocument(formId, ownerId);
  if (!source) return null;

  const structure = ensureFormStructure(
    serializeQuestions(source.questions),
    serializeSections(source.sections),
  );
  const sectionIdMap = new Map<string, string>();
  const sections = structure.sections.map((section, index) => {
    const id = createId();
    sectionIdMap.set(section.id, id);
    return {
      id,
      title: section.title,
      description: section.description,
      order: index,
    };
  });
  const fallbackSectionId = sections[0]!.id;
  const questionIdMap = new Map<string, string>();
  const questions = structure.questions.map((q, index) => {
    const id = createId();
    questionIdMap.set(q.id, id);
    return {
      id,
      type: q.type,
      label: q.label,
      helpText: q.helpText ?? "",
      required: q.required,
      order: index,
      sectionId: sectionIdMap.get(q.sectionId) ?? fallbackSectionId,
      options: q.options
        ? (() => {
            const persisted = toPersistedQuestionOptions(q.options);
            if (!persisted) return undefined;
            if (persisted.choices?.length) {
              persisted.choices = persisted.choices.map((choice) => ({
                id: createId(),
                label: choice.label,
              }));
            }
            return persisted;
          })()
        : undefined,
    };
  });

  await connectDb();
  const copy = await getFormModel().create({
    ownerId,
    title: `${source.title} ${ui.formCopySuffix}`,
    description: source.description ?? "",
    confirmationMessage: source.confirmationMessage,
    themeId: isFormThemeId(source.themeId)
      ? source.themeId
      : DEFAULT_FORM_THEME_ID,
    limitOneResponse: Boolean(source.limitOneResponse),
    collectRespondentEmail: Boolean(source.collectRespondentEmail),
    uniqueBy:
      source.uniqueBy === "phone" || source.uniqueBy === "email"
        ? source.uniqueBy
        : "browser",
    uniqueQuestionId: source.uniqueQuestionId
      ? (questionIdMap.get(source.uniqueQuestionId) ?? null)
      : null,
    status: "draft",
    questions,
    sections,
    headerImage: source.headerImage ?? null,
  });

  return toDetailAsync(copy, { accessRole: "owner", ownerId });
}

export async function deleteOwnedForm(
  formId: string,
  ownerId: string,
): Promise<PublicFormCacheIdentity | null> {
  const form = await getOwnedFormDocument(formId, ownerId);
  if (!form) return null;

  const identity: PublicFormCacheIdentity = {
    id: String(form._id),
    slug: form.slug ?? null,
    shortCode: form.shortCode ?? null,
  };

  const headerPath = form.headerImage?.path;
  if (headerPath && isFormHeaderPath(headerPath, formId)) {
    await deleteFormHeaderImage(headerPath);
  }

  await connectDb();
  await FormCollaborator.deleteMany({ formId: form._id });
  await Response.deleteMany({ formId: form._id });
  await form.deleteOne();
  return identity;
}

export type StatusChangeResult =
  | { ok: true; form: FormDetail }
  | { ok: false; error: string };

export async function setOwnedFormStatus(
  formId: string,
  userId: string,
  email: string,
  status: FormDocument["status"],
): Promise<StatusChangeResult> {
  const form = await getEditableForm(formId, userId, email);
  if (!form) {
    return { ok: false, error: ui.formNotFound };
  }

  if (status === "published") {
    if (!form.questions?.length) {
      return {
        ok: false,
        error: ui.addQuestionBeforePublish,
      };
    }
    try {
      await ensureShortLinkOnForm(form);
    } catch {
      return { ok: false, error: ui.couldNotCreateShortLink };
    }
  }

  if (status === "draft" && form.status === "published") {
    return {
      ok: false,
      error: ui.publishedCannotDraft,
    };
  }

  form.status = status;
  await form.save();
  const access = await resolveFormAccess(formId, userId, email);
  if (!access) {
    return { ok: false, error: ui.formNotFound };
  }
  return {
    ok: true,
    form: await toDetailAsync(form, {
      accessRole: access.role,
      ownerId: form.ownerId,
    }),
  };
}

export async function setOwnedFormHeaderImage(
  formId: string,
  userId: string,
  email: string,
  file: {
    buffer: Buffer;
    contentType: string;
    originalName: string;
  },
): Promise<FormDetail | null> {
  const form = await getEditableForm(formId, userId, email);
  if (!form) return null;

  const previousPath = form.headerImage?.path ?? null;
  const uploaded = await uploadFormHeaderImage({
    formId,
    buffer: file.buffer,
    contentType: file.contentType,
    originalName: file.originalName,
  });

  form.headerImage = uploaded;
  await form.save();

  if (previousPath && previousPath !== uploaded.path) {
    await deleteFormHeaderImage(previousPath);
  }

  const access = await resolveFormAccess(formId, userId, email);
  if (!access) return null;
  return toDetailAsync(form, {
    accessRole: access.role,
    ownerId: form.ownerId,
  });
}

export async function clearOwnedFormHeaderImage(
  formId: string,
  userId: string,
  email: string,
): Promise<FormDetail | null> {
  const form = await getEditableForm(formId, userId, email);
  if (!form) return null;

  const previousPath = form.headerImage?.path ?? null;
  form.headerImage = null;
  await form.save();

  if (previousPath && isFormHeaderPath(previousPath, formId)) {
    await deleteFormHeaderImage(previousPath);
  }

  const access = await resolveFormAccess(formId, userId, email);
  if (!access) return null;
  return toDetailAsync(form, {
    accessRole: access.role,
    ownerId: form.ownerId,
  });
}

export async function saveOwnedFormQuestions(
  formId: string,
  userId: string,
  email: string,
  questions: QuestionInput[],
  sections: SectionInput[],
): Promise<FormDetail | null> {
  const form = await getEditableForm(formId, userId, email);
  if (!form) return null;

  const structure = ensureFormStructure(questions, sections);

  form.sections = structure.sections.map((section, index) => ({
    id: section.id,
    title: section.title ?? "",
    description: section.description ?? "",
    order: index,
  })) as FormDocument["sections"];
  form.questions = structure.questions.map((q, index) => ({
    id: q.id,
    type: q.type,
    label: q.label.trim() || ui.defaultQuestionLabel,
    helpText: q.helpText ?? "",
    required: q.required,
    order: index,
    sectionId: q.sectionId,
    options: toPersistedQuestionOptions(q.options),
  })) as FormDocument["questions"];

  await form.save();
  const access = await resolveFormAccess(formId, userId, email);
  if (!access) return null;
  return toDetailAsync(form, {
    accessRole: access.role,
    ownerId: form.ownerId,
  });
}
