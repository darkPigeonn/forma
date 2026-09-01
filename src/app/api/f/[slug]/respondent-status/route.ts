import { NextRequest, NextResponse } from "next/server";
import { getPublicFormBySlug } from "@/db/queries/public-forms";
import { hasResponseForRespondentEmail } from "@/db/queries/responses";
import {
  isGoogleRespondent,
  verifyRespondentIdToken,
} from "@/lib/firebase/verify-respondent";
import { ui } from "@/lib/ui-id";
import { z } from "zod";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const bodySchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const form = await getPublicFormBySlug(slug);
  if (!form) {
    return NextResponse.json(
      { ok: false, error: ui.formNotFound },
      { status: 404 },
    );
  }

  if (!form.collectRespondentEmail) {
    return NextResponse.json(
      { ok: false, error: ui.invalidRequest },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: ui.invalidJsonBody },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: ui.invalidRequest },
      { status: 400 },
    );
  }

  const respondent = await verifyRespondentIdToken(parsed.data.idToken);
  if (!respondent || !isGoogleRespondent(respondent)) {
    return NextResponse.json(
      { ok: false, error: ui.respondentGoogleRequired },
      { status: 401 },
    );
  }

  const alreadySubmitted =
    form.limitOneResponse &&
    (await hasResponseForRespondentEmail(form.id, respondent.email));

  return NextResponse.json({
    ok: true,
    email: respondent.email,
    alreadySubmitted,
  });
}
