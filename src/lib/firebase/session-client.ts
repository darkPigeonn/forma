"use client";

type SessionResponse = {
  ok: boolean;
  nextPath?: string;
  error?: string;
};

export async function establishSession(idToken: string): Promise<string> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = (await res.json()) as SessionResponse;
  if (!res.ok || !data.ok) {
    throw new Error("session");
  }

  return data.nextPath ?? "/dashboard";
}

export function getEmailVerificationContinueUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  const origin =
    configured ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/verify-email`;
}
