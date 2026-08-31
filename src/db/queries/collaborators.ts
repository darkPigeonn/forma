import { createId } from "@paralleldrive/cuid2";
import { Types } from "mongoose";
import { connectDb } from "@/db/client";
import { FormCollaborator } from "@/db/models/form-collaborator";
import { User } from "@/db/models/user";
import {
  getOwnedFormDocument,
} from "@/db/queries/form-access";
import {
  isValidInviteEmail,
  normalizeCollaboratorEmail,
} from "@/domain/collaborators";
import { getSiteOrigin } from "@/lib/site-origin";
import {
  sendCollaboratorInviteEmail,
  type SendCollaboratorInviteResult,
} from "@/lib/email/send-collaborator-invite";
import { ui } from "@/lib/ui-id";

export type CollaboratorListItem = {
  id: string;
  email: string;
  status: "pending" | "active";
  name: string | null;
  invitedAt: string;
  acceptedAt: string | null;
};

export async function activatePendingInvitesForUser(
  userId: string,
  email: string,
): Promise<void> {
  const normalized = normalizeCollaboratorEmail(email);
  if (!normalized) return;

  await connectDb();
  await FormCollaborator.updateMany(
    {
      email: normalized,
      status: "pending",
    },
    {
      $set: {
        userId,
        status: "active",
        acceptedAt: new Date(),
      },
    },
  );
}

export async function listFormCollaborators(
  formId: string,
  ownerId: string,
): Promise<CollaboratorListItem[] | null> {
  const form = await getOwnedFormDocument(formId, ownerId);
  if (!form) return null;

  await connectDb();
  const rows = await FormCollaborator.find({ formId: form._id }).sort({
    createdAt: 1,
  });

  const userIds = rows
    .map((row) => row.userId)
    .filter((id): id is string => Boolean(id));
  const users = userIds.length
    ? await User.find({ firebaseUid: { $in: userIds } }).lean()
    : [];
  const nameByUid = new Map(
    users.map((user) => [String(user.firebaseUid), String(user.name ?? "")]),
  );

  return rows.map((row) => ({
    id: String(row._id),
    email: row.email,
    status: row.status as "pending" | "active",
    name: row.userId ? nameByUid.get(row.userId) ?? null : null,
    invitedAt: new Date(row.createdAt).toISOString(),
    acceptedAt: row.acceptedAt
      ? new Date(row.acceptedAt).toISOString()
      : null,
  }));
}

export type InviteCollaboratorResult =
  | {
      ok: true;
      inviteUrl: string;
      emailStatus: SendCollaboratorInviteResult["status"];
      collaborator: CollaboratorListItem;
    }
  | { ok: false; error: string };

export async function getCollaboratorInviteUrl(input: {
  formId: string;
  ownerId: string;
  collaboratorId: string;
}): Promise<{ ok: true; inviteUrl: string } | { ok: false; error: string }> {
  const form = await getOwnedFormDocument(input.formId, input.ownerId);
  if (!form) {
    return { ok: false, error: ui.formNotFound };
  }
  if (!Types.ObjectId.isValid(input.collaboratorId)) {
    return { ok: false, error: ui.invalidRequest };
  }

  await connectDb();
  const row = await FormCollaborator.findOne({
    _id: input.collaboratorId,
    formId: form._id,
    status: "pending",
  });
  if (!row?.inviteToken) {
    return { ok: false, error: ui.collaboratorInviteNotFound };
  }

  const origin = await getSiteOrigin();
  return { ok: true, inviteUrl: `${origin}/invite/${row.inviteToken}` };
}

export async function resendCollaboratorInvite(input: {
  formId: string;
  ownerId: string;
  ownerName: string;
  collaboratorId: string;
}): Promise<
  | {
      ok: true;
      inviteUrl: string;
      emailStatus: SendCollaboratorInviteResult["status"];
    }
  | { ok: false; error: string }
> {
  const form = await getOwnedFormDocument(input.formId, input.ownerId);
  if (!form) {
    return { ok: false, error: ui.formNotFound };
  }
  if (!Types.ObjectId.isValid(input.collaboratorId)) {
    return { ok: false, error: ui.invalidRequest };
  }

  await connectDb();
  const row = await FormCollaborator.findOne({
    _id: input.collaboratorId,
    formId: form._id,
    status: "pending",
  });
  if (!row?.inviteToken) {
    return { ok: false, error: ui.collaboratorInviteNotFound };
  }

  const origin = await getSiteOrigin();
  const inviteUrl = `${origin}/invite/${row.inviteToken}`;
  const emailStatus = await sendCollaboratorInviteEmail({
    to: row.email,
    inviteUrl,
    formTitle: form.title,
    inviterName: input.ownerName,
  });

  return { ok: true, inviteUrl, emailStatus: emailStatus.status };
}

export async function inviteFormCollaborator(input: {
  formId: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  inviteEmail: string;
}): Promise<InviteCollaboratorResult> {
  const email = normalizeCollaboratorEmail(input.inviteEmail);
  if (!isValidInviteEmail(email)) {
    return { ok: false, error: ui.collaboratorInvalidEmail };
  }

  const form = await getOwnedFormDocument(input.formId, input.ownerId);
  if (!form) {
    return { ok: false, error: ui.formNotFound };
  }

  if (email === normalizeCollaboratorEmail(input.ownerEmail)) {
    return { ok: false, error: ui.collaboratorCannotInviteSelf };
  }

  await connectDb();

  const ownerUser = await User.findOne({ firebaseUid: input.ownerId }).lean();
  const ownerAccountEmail = ownerUser?.email
    ? normalizeCollaboratorEmail(String(ownerUser.email))
    : "";
  if (ownerAccountEmail && email === ownerAccountEmail) {
    return { ok: false, error: ui.collaboratorCannotInviteSelf };
  }

  const existingUser = await User.findOne({ email }).lean();
  const inviteToken = createId();

  const doc = await FormCollaborator.findOneAndUpdate(
    { formId: form._id, email },
    {
      $set: {
        email,
        role: "editor",
        invitedBy: input.ownerId,
        inviteToken,
        ...(existingUser
          ? {
              userId: String(existingUser.firebaseUid),
              status: "pending",
              acceptedAt: null,
            }
          : {
              status: "pending",
              acceptedAt: null,
            }),
      },
      $setOnInsert: {
        formId: form._id,
      },
    },
    { upsert: true, new: true },
  );

  const origin = await getSiteOrigin();
  const inviteUrl = `${origin}/invite/${inviteToken}`;
  const emailResult = await sendCollaboratorInviteEmail({
    to: email,
    inviteUrl,
    formTitle: form.title,
    inviterName: input.ownerName,
  });

  return {
    ok: true,
    inviteUrl,
    emailStatus: emailResult.status,
    collaborator: {
      id: String(doc._id),
      email: doc.email,
      status: doc.status as "pending" | "active",
      name: existingUser ? String(existingUser.name ?? "") : null,
      invitedAt: new Date(doc.createdAt).toISOString(),
      acceptedAt: doc.acceptedAt
        ? new Date(doc.acceptedAt).toISOString()
        : null,
    },
  };
}

export async function removeFormCollaborator(
  formId: string,
  ownerId: string,
  collaboratorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const form = await getOwnedFormDocument(formId, ownerId);
  if (!form) {
    return { ok: false, error: ui.formNotFound };
  }
  if (!Types.ObjectId.isValid(collaboratorId)) {
    return { ok: false, error: ui.invalidRequest };
  }

  await connectDb();
  const deleted = await FormCollaborator.deleteOne({
    _id: collaboratorId,
    formId: form._id,
  });
  if (!deleted.deletedCount) {
    return { ok: false, error: ui.collaboratorNotFound };
  }
  return { ok: true };
}

export type AcceptInviteResult =
  | { ok: true; formId: string }
  | { ok: false; error: string };

export async function acceptCollaboratorInvite(input: {
  token: string;
  userId: string;
  email: string;
}): Promise<AcceptInviteResult> {
  const token = input.token.trim();
  if (!token) {
    return { ok: false, error: ui.invalidRequest };
  }

  await connectDb();
  const invite = await FormCollaborator.findOne({ inviteToken: token });
  if (!invite) {
    return { ok: false, error: ui.collaboratorInviteNotFound };
  }

  const normalizedEmail = normalizeCollaboratorEmail(input.email);
  if (invite.email !== normalizedEmail) {
    return { ok: false, error: ui.collaboratorInviteEmailMismatch };
  }

  invite.userId = input.userId;
  invite.status = "active";
  invite.acceptedAt = new Date();
  await invite.save();

  return { ok: true, formId: String(invite.formId) };
}

export async function getInvitePreview(token: string) {
  await connectDb();
  const invite = await FormCollaborator.findOne({ inviteToken: token.trim() });
  if (!invite) return null;

  const { getFormModel } = await import("@/db/models/form");
  const formDoc = await getFormModel().findById(invite.formId).lean();
  if (!formDoc) return null;

  const inviter = await User.findOne({ firebaseUid: invite.invitedBy }).lean();

  return {
    email: invite.email,
    status: invite.status as "pending" | "active",
    formTitle: String(formDoc.title ?? ui.untitledForm),
    formId: String(formDoc._id),
    inviterName: inviter?.name ? String(inviter.name) : ui.brand,
  };
}
