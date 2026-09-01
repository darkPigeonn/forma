import { ui } from "@/lib/ui-id";

export async function verifyRespondentAccess(
  formSlug: string,
  idToken: string,
): Promise<
  | { ok: true; email: string; alreadySubmitted: boolean }
  | { ok: false; error: string }
> {
  const res = await fetch(`/api/f/${formSlug}/respondent-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    email?: string;
    alreadySubmitted?: boolean;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.email) {
    return { ok: false, error: data.error ?? ui.respondentGoogleRequired };
  }
  return {
    ok: true,
    email: data.email,
    alreadySubmitted: Boolean(data.alreadySubmitted),
  };
}
