import { createHash, randomBytes } from "crypto";

export const RESPONDENT_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400;

export function respondentCookieName(formId: string) {
  return `forma_once_${formId}`;
}

export function createRespondentToken() {
  return randomBytes(24).toString("hex");
}

export function hashRespondentToken(token: string) {
  return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

export function respondentCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: RESPONDENT_COOKIE_MAX_AGE_SEC,
  };
}

export function localSubmittedKey(formId: string) {
  return `forma:once:${formId}`;
}
