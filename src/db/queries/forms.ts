import { Types } from "mongoose";
import { connectDb } from "@/db/client";
import { Form, type FormDocument } from "@/db/models/form";
import { Response } from "@/db/models/response";
import {
  createDefaultQuestion,
  isShortLinkCode,
  makeShortLinkCode,
  publicShareCode,
} from "@/domain/forms";
import { createId } from "@paralleldrive/cuid2";
import { ui } from "@/lib/ui-id";
import type { QuestionInput } from "@/lib/validators/question";

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
};

export type FormDetail = FormListItem & {
  description: string;
  confirmationMessage: string;
  questions: QuestionInput[];
};

async function allocateUniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeShortLinkCode();
    const exists = await Form.exists({
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
    };

    if (q.options?.choices?.length) {
      base.options = {
        choices: q.options.choices.map((c) => ({
          id: c.id,
          label: c.label,
        })),
      };
    }

    return base;
  });
}

function toListItem(doc: {
  _id: { toString(): string } | string;
  title: string;
  status: FormDocument["status"];
  slug?: string | null;
  shortCode?: string | null;
  questions?: unknown[];
  updatedAt: Date | string;
  createdAt: Date | string;
}): FormListItem {
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
  };
}

function toDetail(doc: FormDocument): FormDetail {
  const item = toListItem(doc);
  return {
    ...item,
    description: doc.description ?? "",
    confirmationMessage:
      doc.confirmationMessage ?? ui.defaultConfirmation,
    questions: serializeQuestions(doc.questions),
  };
}

export async function listFormsForOwner(ownerId: string): Promise<FormListItem[]> {
  await connectDb();
  const docs = await Form.find({ ownerId }).sort({ updatedAt: -1 });
  for (const form of docs) {
    if (
      (form.status === "published" || form.status === "closed") &&
      (form.slug || form.shortCode)
    ) {
      const changed = await ensureShortLinkOnForm(form);
      if (changed) await form.save();
    }
  }
  return docs.map((doc) => toListItem(doc));
}

export async function getOwnedForm(formId: string, ownerId: string) {
  if (!Types.ObjectId.isValid(formId)) {
    return null;
  }
  await connectDb();
  return Form.findOne({ _id: formId, ownerId });
}

export async function getOwnedFormDetail(
  formId: string,
  ownerId: string,
): Promise<FormDetail | null> {
  const form = await getOwnedForm(formId, ownerId);
  if (!form) return null;

  // Backfill short links for already-published forms with legacy long slugs.
  if (
    (form.status === "published" || form.status === "closed") &&
    (form.slug || form.shortCode)
  ) {
    const changed = await ensureShortLinkOnForm(form);
    if (changed) await form.save();
  }

  return toDetail(form);
}

export async function createFormForOwner(
  ownerId: string,
  title?: string,
): Promise<FormDetail> {
  await connectDb();
  const form = await Form.create({
    ownerId,
    title: title ?? ui.untitledForm,
    description: "",
    status: "draft",
    questions: [createDefaultQuestion()],
  });
  return toDetail(form);
}

export async function renameOwnedForm(
  formId: string,
  ownerId: string,
  title: string,
): Promise<FormDetail | null> {
  const form = await getOwnedForm(formId, ownerId);
  if (!form) return null;
  form.title = title;
  await form.save();
  return toDetail(form);
}

export async function updateOwnedFormMeta(
  formId: string,
  ownerId: string,
  patch: {
    title?: string;
    description?: string;
    confirmationMessage?: string;
  },
): Promise<FormDetail | null> {
  const form = await getOwnedForm(formId, ownerId);
  if (!form) return null;
  if (patch.title !== undefined) form.title = patch.title;
  if (patch.description !== undefined) form.description = patch.description;
  if (patch.confirmationMessage !== undefined) {
    form.confirmationMessage = patch.confirmationMessage;
  }
  await form.save();
  return toDetail(form);
}

export async function duplicateOwnedForm(
  formId: string,
  ownerId: string,
): Promise<FormDetail | null> {
  const source = await getOwnedForm(formId, ownerId);
  if (!source) return null;

  const questions = (source.questions ?? []).map(
    (
      q: {
        type: FormDocument["questions"][number]["type"];
        label: string;
        helpText?: string | null;
        required?: boolean | null;
        options?: { choices?: { label: string }[] } | null;
      },
      index: number,
    ) => ({
      id: createId(),
      type: q.type,
      label: q.label,
      helpText: q.helpText ?? "",
      required: Boolean(q.required),
      order: index,
      options: q.options
        ? {
            choices: (q.options.choices ?? []).map((c: { label: string }) => ({
              id: createId(),
              label: c.label,
            })),
          }
        : undefined,
    }),
  );

  await connectDb();
  const copy = await Form.create({
    ownerId,
    title: `${source.title} ${ui.formCopySuffix}`,
    description: source.description ?? "",
    confirmationMessage: source.confirmationMessage,
    status: "draft",
    questions,
  });

  return toDetail(copy);
}

export async function deleteOwnedForm(
  formId: string,
  ownerId: string,
): Promise<boolean> {
  const form = await getOwnedForm(formId, ownerId);
  if (!form) return false;

  await connectDb();
  await Response.deleteMany({ formId: form._id });
  await form.deleteOne();
  return true;
}

export type StatusChangeResult =
  | { ok: true; form: FormDetail }
  | { ok: false; error: string };

export async function setOwnedFormStatus(
  formId: string,
  ownerId: string,
  status: FormDocument["status"],
): Promise<StatusChangeResult> {
  const form = await getOwnedForm(formId, ownerId);
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
  return { ok: true, form: toDetail(form) };
}

export async function saveOwnedFormQuestions(
  formId: string,
  ownerId: string,
  questions: QuestionInput[],
): Promise<FormDetail | null> {
  const form = await getOwnedForm(formId, ownerId);
  if (!form) return null;

  form.questions = questions.map((q, index) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    helpText: q.helpText ?? "",
    required: q.required,
    order: index,
    options: q.options
      ? {
          choices: q.options.choices.map((c) => ({
            id: c.id,
            label: c.label,
          })),
        }
      : undefined,
  }));

  await form.save();
  return toDetail(form);
}
