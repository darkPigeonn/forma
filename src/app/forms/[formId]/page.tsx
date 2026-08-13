import Link from "next/link";
import { notFound } from "next/navigation";
import { FormWorkspace } from "@/components/forms/form-workspace";
import { getOwnedFormDetail } from "@/db/queries/forms";
import { getOwnedFormResponsesBundle } from "@/db/queries/responses";
import { requireSessionUser } from "@/lib/firebase/auth";
import { ui } from "@/lib/ui-id";

type FormPageProps = {
  params: Promise<{ formId: string }>;
};

export async function generateMetadata({ params }: FormPageProps) {
  const { formId } = await params;
  try {
    const user = await requireSessionUser();
    const form = await getOwnedFormDetail(formId, user.uid);
    return { title: form?.title ?? ui.formMetaTitle };
  } catch {
    return { title: ui.formMetaTitle };
  }
}

export default async function FormDetailPage({ params }: FormPageProps) {
  const { formId } = await params;
  const user = await requireSessionUser();
  const form = await getOwnedFormDetail(formId, user.uid);

  if (!form) {
    notFound();
  }

  const responses =
    (await getOwnedFormResponsesBundle(formId, user.uid)) ?? {
      total: 0,
      items: [],
      summaries: [],
    };

  return (
    <section className="space-y-4">
      <Link
        href="/dashboard"
        className="inline-flex text-sm font-medium text-accent hover:underline"
      >
        {ui.backToForms}
      </Link>

      <FormWorkspace form={form} responses={responses} />
    </section>
  );
}
