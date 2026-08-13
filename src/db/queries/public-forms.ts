import { connectDb } from "@/db/client";
import { Form } from "@/db/models/form";
import { publicShareCode } from "@/domain/forms";
import type { QuestionInput } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";

export type PublicFormView = {
  id: string;
  title: string;
  description: string;
  status: "published" | "closed";
  confirmationMessage: string;
  /** Preferred public path segment (short code when available). */
  slug: string;
  questions: QuestionInput[];
};

function serializeQuestions(
  questions: Array<{
    id: string;
    type: string;
    label: string;
    helpText?: string | null;
    required?: boolean | null;
    order?: number | null;
    options?: { choices?: { id: string; label: string }[] } | null;
  }> | undefined,
): QuestionInput[] {
  return (questions ?? []).map((q, index) => {
    const base: QuestionInput = {
      id: q.id,
      type: q.type as QuestionInput["type"],
      label: q.label,
      helpText: q.helpText ?? "",
      required: Boolean(q.required),
      order: typeof q.order === "number" ? q.order : index,
    };

    if (q.options?.choices?.length) {
      base.options = {
        choices: q.options.choices.map((c) => ({
          id: c.id,
          label: c.label,
        })),
      };
    }

    return base;
  });
}

/** Load a form by public slug or short code. Draft/missing → null. Closed still returned for messaging. */
export async function getPublicFormBySlug(
  slug: string,
): Promise<PublicFormView | null> {
  await connectDb();
  const form = await Form.findOne({
    status: { $in: ["published", "closed"] },
    $or: [{ slug }, { shortCode: slug }],
  })
    .select({
      title: 1,
      description: 1,
      status: 1,
      confirmationMessage: 1,
      slug: 1,
      shortCode: 1,
      questions: 1,
    })
    .lean();

  if (!form) return null;
  const share = publicShareCode(form);
  if (!share) return null;

  return {
    id: String(form._id),
    title: form.title,
    description: form.description ?? "",
    status: form.status as "published" | "closed",
    confirmationMessage:
      form.confirmationMessage ?? ui.defaultConfirmation,
    slug: share,
    questions: serializeQuestions(form.questions),
  };
}
