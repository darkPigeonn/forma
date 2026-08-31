"use server";

import { revalidatePath } from "next/cache";
import {
  acceptCollaboratorInvite,
  getCollaboratorInviteUrl,
  inviteFormCollaborator,
  listFormCollaborators,
  removeFormCollaborator,
  resendCollaboratorInvite,
} from "@/db/queries/collaborators";
import { isCollaboratorEmailConfigured } from "@/lib/email/send-collaborator-invite";
import { requireSessionUser } from "@/lib/firebase/auth";
import {
  acceptInviteSchema,
  inviteCollaboratorSchema,
  removeCollaboratorSchema,
} from "@/lib/validators/collaborator";
import { ui } from "@/lib/ui-id";

async function requireUser() {
  try {
    return await requireSessionUser();
  } catch {
    return null;
  }
}

export async function listCollaboratorsAction(formId: string) {
  const user = await requireUser();
  if (!user) {
    return { ok: false as const, error: ui.signInRequired };
  }

  const items = await listFormCollaborators(formId, user.uid);
  if (!items) {
    return { ok: false as const, error: ui.formNotFound };
  }

  return { ok: true as const, items };
}

export async function getCollaboratorEmailStatusAction() {
  return { ok: true as const, configured: isCollaboratorEmailConfigured() };
}

export async function getCollaboratorInviteUrlAction(input: {
  formId: string;
  collaboratorId: string;
}) {
  const user = await requireUser();
  if (!user) {
    return { ok: false as const, error: ui.signInRequired };
  }

  return getCollaboratorInviteUrl({
    formId: input.formId,
    ownerId: user.uid,
    collaboratorId: input.collaboratorId,
  });
}

export async function resendCollaboratorInviteAction(input: {
  formId: string;
  collaboratorId: string;
}) {
  const user = await requireUser();
  if (!user) {
    return { ok: false as const, error: ui.signInRequired };
  }

  const result = await resendCollaboratorInvite({
    formId: input.formId,
    ownerId: user.uid,
    ownerName: user.name,
    collaboratorId: input.collaboratorId,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath(`/forms/${input.formId}`);
  return result;
}

export async function inviteCollaboratorAction(input: unknown) {
  const user = await requireUser();
  if (!user) {
    return { ok: false as const, error: ui.signInRequired };
  }

  const parsed = inviteCollaboratorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? ui.invalidRequest,
    };
  }

  const result = await inviteFormCollaborator({
    formId: parsed.data.formId,
    ownerId: user.uid,
    ownerName: user.name,
    ownerEmail: user.email,
    inviteEmail: parsed.data.email,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath(`/forms/${parsed.data.formId}`);
  return result;
}

export async function removeCollaboratorAction(input: unknown) {
  const user = await requireUser();
  if (!user) {
    return { ok: false as const, error: ui.signInRequired };
  }

  const parsed = removeCollaboratorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? ui.invalidRequest,
    };
  }

  const result = await removeFormCollaborator(
    parsed.data.formId,
    user.uid,
    parsed.data.collaboratorId,
  );
  if (!result.ok) {
    return result;
  }

  revalidatePath(`/forms/${parsed.data.formId}`);
  return { ok: true as const };
}

export async function acceptInviteAction(input: unknown) {
  const user = await requireUser();
  if (!user) {
    return { ok: false as const, error: ui.signInRequired };
  }

  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? ui.invalidRequest,
    };
  }

  const result = await acceptCollaboratorInvite({
    token: parsed.data.token,
    userId: user.uid,
    email: user.email,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/forms/${result.formId}`);
  return { ok: true as const, formId: result.formId };
}
