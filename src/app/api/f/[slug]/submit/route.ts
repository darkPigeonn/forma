import { NextResponse } from "next/server";
import { hashIp, validateAnswersAgainstQuestions } from "@/domain/answers";
import { getPublicFormBySlug } from "@/db/queries/public-forms";
import { createFormResponse } from "@/db/queries/responses";
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

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const ip = clientIp(request);

  const limited = rateLimitAll([
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
    form.questions,
    parsed.data.answers,
  );

  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: ui.fixHighlightedFields, errors: validated.errors },
      { status: 400 },
    );
  }

  try {
    await createFormResponse({
      formId: form.id,
      answers: validated.answers,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipHash: hashIp(ip),
    });
  } catch (error) {
    console.error("submit failed", error);
    return NextResponse.json(
      { ok: false, error: ui.couldNotSaveResponse },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    confirmationMessage: form.confirmationMessage,
  });
}
