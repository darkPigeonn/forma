"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidatePublicForm } from "@/lib/cache/revalidate-public-form";
import { requireSessionUser } from "@/lib/firebase/auth";
import {
  createFormSchema,
  formIdOnlySchema,
  renameFormSchema,
  setFormStatusSchema,
  updateFormMetaSchema,
} from "@/lib/validators/form";
import {
  createFormForOwner,
  createFormFromTemplateForOwner,
  deleteOwnedForm,
  duplicateOwnedForm,
  renameOwnedForm,
  saveOwnedFormQuestions,
  setOwnedFormStatus,
  updateOwnedFormMeta,
} from "@/db/queries/forms";
import { saveFormQuestionsSchema } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireOwner() {
  try {
    return await requireSessionUser();
  } catch {
    return null;
  }
}

export async function createFormAction(rawTitle?: string) {
  const user = await requireOwner();
  if (!user) {
    return { ok: false as const, error: ui.signInRequired };
  }

  const parsed = createFormSchema.safeParse(
    rawTitle !== undefined ? { title: rawTitle } : {},
  );
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const form = await createFormForOwner(
    user.uid,
    parsed.data.title ?? ui.untitledForm,
  );
  revalidatePath("/dashboard");
  redirect(`/forms/${form.id}`);
}

export async function createFormFromTemplateAction(templateId: string) {
  const user = await requireOwner();
  if (!user) {
    return { ok: false as const, error: ui.signInRequired };
  }

  const parsed = createFormSchema.safeParse({ templateId });
  if (!parsed.success || !parsed.data.templateId) {
    return { ok: false as const, error: ui.invalidRequest };
  }

  const form = await createFormFromTemplateForOwner(
    user.uid,
    parsed.data.templateId,
  );
  if (!form) {
    return { ok: false as const, error: ui.invalidRequest };
  }
  revalidatePath("/dashboard");
  redirect(`/forms/${form.id}`);
}

export async function renameFormAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireOwner();
  if (!user) return { ok: false, error: ui.signInRequired };

  const parsed = renameFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const form = await renameOwnedForm(
    parsed.data.formId,
    user.uid,
    user.email,
    parsed.data.title,
  );
  if (!form) return { ok: false, error: "Form not found" };

  revalidatePath("/dashboard");
  revalidatePath(`/forms/${form.id}`);
  revalidatePublicForm(form);
  return { ok: true };
}

export async function updateFormMetaAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireOwner();
  if (!user) return { ok: false, error: ui.signInRequired };

  const parsed = updateFormMetaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { formId, ...patch } = parsed.data;
  const form = await updateOwnedFormMeta(formId, user.uid, user.email, patch);
  if (!form) return { ok: false, error: "Form not found" };

  revalidatePath("/dashboard");
  revalidatePath(`/forms/${form.id}`);
  revalidatePublicForm(form);
  return { ok: true };
}

export async function duplicateFormAction(
  input: unknown,
): Promise<ActionResult & { formId?: string }> {
  const user = await requireOwner();
  if (!user) return { ok: false, error: ui.signInRequired };

  const parsed = formIdOnlySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid form" };
  }

  const form = await duplicateOwnedForm(parsed.data.formId, user.uid);
  if (!form) return { ok: false, error: "Form not found" };

  revalidatePath("/dashboard");
  return { ok: true, formId: form.id };
}

export async function deleteFormAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireOwner();
  if (!user) return { ok: false, error: ui.signInRequired };

  const parsed = formIdOnlySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid form" };
  }

  const deleted = await deleteOwnedForm(parsed.data.formId, user.uid);
  if (!deleted) return { ok: false, error: "Form not found" };

  revalidatePublicForm(deleted);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setFormStatusAction(
  input: unknown,
): Promise<ActionResult & { publicPath?: string | null }> {
  const user = await requireOwner();
  if (!user) return { ok: false, error: ui.signInRequired };

  const parsed = setFormStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status change" };
  }

  const result = await setOwnedFormStatus(
    parsed.data.formId,
    user.uid,
    user.email,
    parsed.data.status,
  );

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/forms/${result.form.id}`);
  revalidatePublicForm(result.form);
  return { ok: true, publicPath: result.form.publicPath };
}

export async function saveFormQuestionsAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await requireOwner();
  if (!user) return { ok: false, error: ui.signInRequired };

  const parsed = saveFormQuestionsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid questions",
    };
  }

  const form = await saveOwnedFormQuestions(
    parsed.data.formId,
    user.uid,
    user.email,
    parsed.data.questions,
    parsed.data.sections,
  );
  if (!form) return { ok: false, error: "Form not found" };

  revalidatePath("/dashboard");
  revalidatePath(`/forms/${form.id}`);
  revalidatePublicForm(form);
  return { ok: true };
}
