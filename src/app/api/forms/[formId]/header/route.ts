import { NextResponse } from "next/server";
import {
  clearOwnedFormHeaderImage,
  setOwnedFormHeaderImage,
} from "@/db/queries/forms";
import { getEditableForm } from "@/db/queries/form-access";
import { revalidatePublicForm } from "@/lib/cache/revalidate-public-form";
import { getSessionUser } from "@/lib/firebase/auth";
import { ui } from "@/lib/ui-id";

type RouteContext = {
  params: Promise<{ formId: string }>;
};

async function requireEditableForm(formId: string) {
  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const form = await getEditableForm(formId, user.uid, user.email);
  if (!form) {
    return null;
  }

  return { user, form };
}

export async function POST(request: Request, context: RouteContext) {
  const { formId } = await context.params;
  const auth = await requireEditableForm(formId);
  if (!auth) {
    const user = await getSessionUser();
    return NextResponse.json(
      { ok: false, error: user ? ui.formNotFound : ui.signInRequired },
      { status: user ? 404 : 401 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: ui.invalidRequest },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: ui.headerImageRequired },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const updated = await setOwnedFormHeaderImage(
      formId,
      auth.user.uid,
      auth.user.email,
      {
        buffer,
        contentType: file.type || "image/jpeg",
        originalName: file.name || "header.jpg",
      },
    );
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: ui.formNotFound },
        { status: 404 },
      );
    }
    revalidatePublicForm(updated, { fromRouteHandler: true });
    return NextResponse.json({
      ok: true,
      headerImage: updated.headerImage,
    });
  } catch (error) {
    console.error("header upload failed", error);
    const message =
      error instanceof Error ? error.message : ui.headerImageUploadFailed;
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { formId } = await context.params;
  const auth = await requireEditableForm(formId);
  if (!auth) {
    const user = await getSessionUser();
    return NextResponse.json(
      { ok: false, error: user ? ui.formNotFound : ui.signInRequired },
      { status: user ? 404 : 401 },
    );
  }

  const updated = await clearOwnedFormHeaderImage(
    formId,
    auth.user.uid,
    auth.user.email,
  );
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: ui.formNotFound },
      { status: 404 },
    );
  }

  revalidatePublicForm(updated, { fromRouteHandler: true });
  return NextResponse.json({ ok: true });
}
