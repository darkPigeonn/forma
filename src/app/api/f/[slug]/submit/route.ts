import { NextRequest, NextResponse } from "next/server";
import { hashIp, validateAnswersAgainstQuestions } from "@/domain/answers";
import { getPublicFormBySlug } from "@/db/queries/public-forms";
import {
  createFormResponse,
  hasResponseForRespondent,
  hasResponseForUniqueKey,
} from "@/db/queries/responses";
import { uniqueKeyFromAnswers } from "@/domain/unique-key";
import {
  createRespondentToken,
  hashRespondentToken,
  respondentCookieName,
  respondentCookieOptions,
} from "@/lib/respondent-cookie";
import {
  PUBLIC_SUBMIT_LIMITS,
  rateLimitAll,
} from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { submitAnswersSchema } from "@/lib/validators/response";
import { ui } from "@/lib/ui-id";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const MAX_JSON_BYTES = 256 * 1024;

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const ip = clientIp(request);

  const limited = await rateLimitAll([
    {
      key: `submit:ip:${slug}:${ip}`,
      limit: PUBLIC_SUBMIT_LIMITS.perIpPerMinute,
      windowMs: PUBLIC_SUBMIT_LIMITS.windowMs,
    },
    {
      key: `submit:form:${slug}`,
      limit: PUBLIC_SUBMIT_LIMITS.perFormPerMinute,
      windowMs: PUBLIC_SUBMIT_LIMITS.windowMs,
    },
  ]);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: ui.tooManySubmissions },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_JSON_BYTES) {
    return NextResponse.json(
      { ok: false, error: ui.invalidSubmissionPayload },
      { status: 413 },
    );
  }

  const form = await getPublicFormBySlug(slug);
  if (!form) {
    return NextResponse.json(
      { ok: false, error: ui.formNotFound },
      { status: 404 },
    );
  }

  if (form.status === "closed") {
    return NextResponse.json(
      { ok: false, error: ui.formClosedBody },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_JSON_BYTES) {
      return NextResponse.json(
        { ok: false, error: ui.invalidSubmissionPayload },
        { status: 413 },
      );
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      { ok: false, error: ui.invalidJsonBody },
      { status: 400 },
    );
  }

  const parsed = submitAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: ui.invalidSubmissionPayload },
      { status: 400 },
    );
  }

  const validated = validateAnswersAgainstQuestions(
    form.id,
    form.questions,
    parsed.data.answers,
  );

  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: ui.fixHighlightedFields, errors: validated.errors },
      { status: 400 },
    );
  }

  const uniqueResult = uniqueKeyFromAnswers(
    form.uniqueBy,
    form.uniqueQuestionId,
    form.questions,
    validated.answers,
  );
  if (!uniqueResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: ui.fixHighlightedFields,
        errors: [
          {
            questionId: uniqueResult.questionId,
            message: uniqueResult.message,
          },
        ],
      },
      { status: 400 },
    );
  }
  if (uniqueResult.key) {
    if (await hasResponseForUniqueKey(form.id, uniqueResult.key)) {
      return NextResponse.json(
        {
          ok: false,
          error: ui.uniqueAlreadyUsed,
          errors: form.uniqueQuestionId
            ? [
                {
                  questionId: form.uniqueQuestionId,
                  message: ui.uniqueAlreadyUsed,
                },
              ]
            : undefined,
        },
        { status: 409 },
      );
    }
  }

  const cookieName = respondentCookieName(form.id);
  let respondentToken = request.cookies.get(cookieName)?.value;
  let respondentKey: string | undefined;

  if (form.limitOneResponse) {
    if (respondentToken) {
      respondentKey = hashRespondentToken(respondentToken);
      if (await hasResponseForRespondent(form.id, respondentKey)) {
        return NextResponse.json(
          {
            ok: false,
            error: ui.alreadySubmittedBody,
            alreadySubmitted: true,
          },
          { status: 409 },
        );
      }
    } else {
      respondentToken = createRespondentToken();
      respondentKey = hashRespondentToken(respondentToken);
    }
  }

  let created: { id: string; submittedAt: string };
  try {
    created = await createFormResponse({
      formId: form.id,
      answers: validated.answers,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipHash: hashIp(ip),
      respondentKey,
      uniqueKey: uniqueResult.key ?? undefined,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: ui.alreadySubmittedBody,
          alreadySubmitted: true,
        },
        { status: 409 },
      );
    }
    console.error("submit failed", error);
    return NextResponse.json(
      { ok: false, error: ui.couldNotSaveResponse },
      { status: 500 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    confirmationMessage: form.confirmationMessage,
    receiptId: created.id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase(),
    submittedAt: created.submittedAt,
  });
  if (form.limitOneResponse && respondentToken) {
    response.cookies.set(
      cookieName,
      respondentToken,
      respondentCookieOptions(),
    );
  }
  return response;
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}
