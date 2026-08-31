"use server";

import { requireSessionUser } from "@/lib/firebase/auth";
import { markOnboardingComplete } from "@/db/queries/users";
import { ui } from "@/lib/ui-id";

export async function completeOnboardingAction() {
  try {
    const user = await requireSessionUser();
    await markOnboardingComplete(user.uid);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: ui.signInRequired };
  }
}
