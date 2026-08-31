export type FormAccessRole = "owner" | "editor";

export function normalizeCollaboratorEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidInviteEmail(email: string): boolean {
  const normalized = normalizeCollaboratorEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
