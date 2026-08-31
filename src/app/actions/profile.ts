"use server";

import { completeUserProfile } from "@/db/queries/users";
import { needsEmailVerification } from "@/lib/auth/post-auth";
import { requireAuthenticatedUser } from "@/lib/auth/require-ready-user";
import { getAdminAuth } from "@/lib/firebase/admin";
import { completeProfileSchema } from "@/lib/validators/profile";
import { ui } from "@/lib/ui-id";

export async function completeProfileAction(input: unknown) {
  const user = await requireAuthenticatedUser();

  if (
    needsEmailVerification({
      signInProvider: user.signInProvider,
      emailVerified: user.emailVerified,
    })
  ) {
    return { ok: false as const, error: ui.authEmailNotVerified };
  }

  const parsed = completeProfileSchema.safeParse(input);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? ui.profileSaveFailed;
    return { ok: false as const, error: message };
  }

  try {
    await getAdminAuth().updateUser(user.uid, {
      displayName: parsed.data.name,
    });
  } catch (error) {
    console.error("Failed to update Firebase display name:", error);
  }

  const profile = await completeUserProfile({
    firebaseUid: user.uid,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
  });

  if (!profile) {
    return { ok: false as const, error: ui.profileSaveFailed };
  }

  return {
    ok: true as const,
    profile: {
      name: profile.name,
      phone: profile.phone ?? null,
    },
  };
}
