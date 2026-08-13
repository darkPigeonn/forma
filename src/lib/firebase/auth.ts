import { cookies } from "next/headers";
import { connectDb } from "@/db/client";
import { User, type UserDocument } from "@/db/models/user";
import { getAdminAuth } from "@/lib/firebase/admin";
import { ui } from "@/lib/ui-id";

export const SESSION_COOKIE_NAME = "forma_session";
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
  photoURL?: string | null;
  profile: UserDocument;
};

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

  return { sessionCookie, profile, decoded };
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
      photoURL: profile.photoURL,
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
