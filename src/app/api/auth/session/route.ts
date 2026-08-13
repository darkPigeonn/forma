import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  createSessionCookie,
} from "@/lib/firebase/auth";
import { z } from "zod";

const bodySchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { idToken } = bodySchema.parse(json);
    const { sessionCookie, profile } = await createSessionCookie(idToken);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });

    return NextResponse.json({
      ok: true,
      user: {
        email: profile.email,
        name: profile.name,
      },
    });
  } catch (error) {
    console.error("session create failed", error);
    return NextResponse.json(
      { ok: false, error: "Unable to create session" },
      { status: 401 },
    );
  }
}
