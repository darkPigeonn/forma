import { redirect } from "next/navigation";
import {
  getSessionUser,
  type SessionUser,
} from "@/lib/firebase/auth";
import {
  isProfileComplete,
  needsEmailVerification,
  resolvePostAuthPath,
} from "@/lib/auth/post-auth";

export async function requireReadyUser(
  fallback = "/dashboard",
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const next = resolvePostAuthPath({
    signInProvider: user.signInProvider,
    emailVerified: user.emailVerified,
    profile: user.profile,
    fallback,
  });

  if (next !== fallback) {
    redirect(next);
  }

  return user;
}

export async function requireAuthenticatedUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function redirectAuthenticatedUser(fallback = "/dashboard"): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  redirect(
    resolvePostAuthPath({
      signInProvider: user.signInProvider,
      emailVerified: user.emailVerified,
      profile: user.profile,
      fallback,
    }),
  );
}

export function guardVerifyEmailPage(user: SessionUser) {
  if (
    !needsEmailVerification({
      signInProvider: user.signInProvider,
      emailVerified: user.emailVerified,
    })
  ) {
    redirect(
      isProfileComplete(user.profile) ? "/dashboard" : "/complete-profile",
    );
  }
}

export function guardCompleteProfilePage(user: SessionUser) {
  if (
    needsEmailVerification({
      signInProvider: user.signInProvider,
      emailVerified: user.emailVerified,
    })
  ) {
    redirect("/verify-email");
  }

  if (isProfileComplete(user.profile)) {
    redirect("/dashboard");
  }
}
