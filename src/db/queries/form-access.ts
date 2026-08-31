import { Types, type HydratedDocument } from "mongoose";
import { connectDb } from "@/db/client";
import { FormCollaborator } from "@/db/models/form-collaborator";
import { getFormModel, type FormDocument } from "@/db/models/form";
import {
  normalizeCollaboratorEmail,
  type FormAccessRole,
} from "@/domain/collaborators";
import { featureFlags } from "@/lib/feature-flags";

export type FormDoc = HydratedDocument<FormDocument>;

export type FormAccess = {
  form: FormDoc;
  role: FormAccessRole;
};

export async function resolveFormAccess(
  formId: string,
  userId: string,
  email: string,
): Promise<FormAccess | null> {
  if (!Types.ObjectId.isValid(formId)) return null;

  await connectDb();
  const form = await getFormModel().findById(formId);
  if (!form) return null;

  if (form.ownerId === userId) {
    return { form, role: "owner" };
  }

  if (!featureFlags.collaborators) return null;

  const normalizedEmail = normalizeCollaboratorEmail(email);
  const collaborator = await FormCollaborator.findOne({
    formId: form._id,
    status: "active",
    $or: [{ userId }, { email: normalizedEmail }],
  });

  if (!collaborator) return null;
  return { form, role: "editor" };
}

export async function getEditableForm(
  formId: string,
  userId: string,
  email: string,
): Promise<FormDoc | null> {
  const access = await resolveFormAccess(formId, userId, email);
  return access?.form ?? null;
}

export async function getOwnedFormDocument(
  formId: string,
  ownerId: string,
): Promise<FormDoc | null> {
  if (!Types.ObjectId.isValid(formId)) return null;
  await connectDb();
  return getFormModel().findOne({ _id: formId, ownerId });
}

export async function listCollaboratedFormIds(
  userId: string,
  email: string,
): Promise<Types.ObjectId[]> {
  if (!featureFlags.collaborators) return [];
  await connectDb();
  const normalizedEmail = normalizeCollaboratorEmail(email);
  const rows = await FormCollaborator.find({
    status: "active",
    $or: [{ userId }, { email: normalizedEmail }],
  }).select("formId");
  return rows.map((row) => row.formId as Types.ObjectId);
}
