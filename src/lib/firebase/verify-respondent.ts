import { getAdminAuth } from "@/lib/firebase/admin";

export type VerifiedRespondent = {
  uid: string;
  email: string;
  emailVerified: boolean;
  signInProvider: string;
};

export async function verifyRespondentIdToken(
  idToken: string,
): Promise<VerifiedRespondent | null> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();
    if (!email) return null;

    const provider = decoded.firebase?.sign_in_provider;
    const signInProvider = typeof provider === "string" ? provider : "unknown";

    return {
      uid: decoded.uid,
      email,
      emailVerified: Boolean(decoded.email_verified),
      signInProvider,
    };
  } catch {
    return null;
  }
}

export function isGoogleRespondent(
  respondent: VerifiedRespondent,
): boolean {
  return respondent.signInProvider === "google.com";
}
