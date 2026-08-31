import { z } from "zod";

export const inviteCollaboratorSchema = z.object({
  formId: z.string().min(1),
  email: z.string().trim().min(3).max(320),
});

export const removeCollaboratorSchema = z.object({
  formId: z.string().min(1),
  collaboratorId: z.string().min(1),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});
