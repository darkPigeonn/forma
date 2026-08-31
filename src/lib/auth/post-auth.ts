import type { UserDocument } from "@/db/models/user";

export function isProfileComplete(profile: UserDocument): boolean {
  if (profile.profileCompletedAt) return true;
  // Pengguna lama sebelum gate profil (sudah selesai onboarding tour).
  if (profile.onboardingCompletedAt) return true;
  return false;
}

export function needsEmailVerification(input: {
  signInProvider: string;
  emailVerified: boolean;
}): boolean {
  return input.signInProvider === "password" && !input.emailVerified;
}

export function resolvePostAuthPath(input: {
  signInProvider: string;
  emailVerified: boolean;
  profile: UserDocument;
  fallback?: string;
}): string {
  if (
    needsEmailVerification({
      signInProvider: input.signInProvider,
      emailVerified: input.emailVerified,
    })
  ) {
    return "/verify-email";
  }

  if (!isProfileComplete(input.profile)) {
    return "/complete-profile";
  }

  return input.fallback ?? "/dashboard";
}
