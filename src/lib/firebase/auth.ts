import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { connectDb } from "@/db/client";
import { User, type UserDocument } from "@/db/models/user";
import { getAdminAuth } from "@/lib/firebase/admin";
import { activatePendingInvitesForUser } from "@/db/queries/collaborators";
import { featureFlags } from "@/lib/feature-flags";
import { ui } from "@/lib/ui-id";

export const SESSION_COOKIE_NAME = "forma_session";
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
  phone?: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  signInProvider: string;
  profile: UserDocument;
};

function readSignInProvider(decoded: DecodedIdToken): string {
  const provider = decoded.firebase?.sign_in_provider;
  return typeof provider === "string" ? provider : "unknown";
}

export async function createSessionCookie(idToken: string) {
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(idToken);
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  await connectDb();
  const profile = await User.findOneAndUpdate(
    { firebaseUid: decoded.uid },
    {
      firebaseUid: decoded.uid,
      email: decoded.email ?? "",
      name:
        decoded.name ||
        decoded.email?.split("@")[0] ||
        ui.defaultUserName,
      photoURL: decoded.picture ?? undefined,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (profile.email && featureFlags.collaborators) {
    await activatePendingInvitesForUser(decoded.uid, profile.email);
  }

  return {
    sessionCookie,
    profile,
    decoded,
    emailVerified: Boolean(decoded.email_verified),
    signInProvider: readSignInProvider(decoded),
  };
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Invalidate the Firebase session and clear the browser cookie. */
export async function revokeSessionAndClearCookie(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (session) {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(session, false);
      await getAdminAuth().revokeRefreshTokens(decoded.uid);
    } catch {
      // Cookie already invalid or expired — still clear it below.
    }
  }

  await clearSessionCookie();
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!session) {
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifySessionCookie(session, true);
    await connectDb();
    const profile = await User.findOne({ firebaseUid: decoded.uid });
    if (!profile) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: profile.email,
      name: profile.name,
      phone: profile.phone ?? null,
      photoURL: profile.photoURL,
      emailVerified: Boolean(decoded.email_verified),
      signInProvider: readSignInProvider(decoded),
      profile,
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
