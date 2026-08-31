"use server";

import { requireSessionUser } from "@/lib/firebase/auth";
import { getAccessibleResponseDetail } from "@/db/queries/responses";
import { ui } from "@/lib/ui-id";
import { z } from "zod";

const schema = z.object({
  formId: z.string().min(1),
  responseId: z.string().min(1),
});

export async function getResponseDetailAction(input: unknown) {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return { ok: false as const, error: ui.signInRequired };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: ui.invalidRequest };
  }

  const detail = await getAccessibleResponseDetail(
    parsed.data.formId,
    parsed.data.responseId,
    user.uid,
    user.email,
  );

  if (!detail) {
    return { ok: false as const, error: ui.responseNotFound };
  }

  return { ok: true as const, response: detail };
}
