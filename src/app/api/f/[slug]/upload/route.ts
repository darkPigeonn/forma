import { NextResponse } from "next/server";
import { getPublicFormBySlug } from "@/db/queries/public-forms";
import {
  PUBLIC_UPLOAD_LIMITS,
  rateLimitAll,
} from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { uploadFormFile } from "@/lib/storage/form-uploads";
import { ui } from "@/lib/ui-id";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const ip = clientIp(request);

  const limited = await rateLimitAll([
    {
      key: `upload:ip:${slug}:${ip}`,
      limit: PUBLIC_UPLOAD_LIMITS.perIpPerMinute,
      windowMs: PUBLIC_UPLOAD_LIMITS.windowMs,
    },
    {
      key: `upload:form:${slug}`,
      limit: PUBLIC_UPLOAD_LIMITS.perFormPerMinute,
      windowMs: PUBLIC_UPLOAD_LIMITS.windowMs,
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: ui.invalidSubmissionPayload },
      { status: 400 },
    );
  }

  const questionId = String(formData.get("questionId") ?? "");
  const file = formData.get("file");

  if (!questionId) {
    return NextResponse.json(
      { ok: false, error: ui.invalidRequest },
      { status: 400 },
    );
  }

  const question = form.questions.find((q) => q.id === questionId);
  if (!question || question.type !== "file_upload") {
    return NextResponse.json(
      { ok: false, error: "Pertanyaan unggah file tidak ditemukan" },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "File wajib diunggah" },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await uploadFormFile({
      formId: form.id,
      questionId,
      buffer,
      contentType: file.type || "application/octet-stream",
      originalName: file.name || "file",
    });

    return NextResponse.json({ ok: true, file: meta });
  } catch (error) {
    console.error("upload failed", error);
    const message =
      error instanceof Error ? error.message : "Gagal mengunggah file";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
