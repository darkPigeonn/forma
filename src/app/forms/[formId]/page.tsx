import { notFound } from "next/navigation";
import { FormWorkspace } from "@/components/forms/form-workspace";
import { getAccessibleFormDetail } from "@/db/queries/forms";
import { getAccessibleFormResponsesBundle } from "@/db/queries/responses";
import { requireSessionUser } from "@/lib/firebase/auth";
import { getSiteOrigin } from "@/lib/site-origin";
import { ui } from "@/lib/ui-id";

export const maxDuration = 120;

type FormPageProps = {
  params: Promise<{ formId: string }>;
};

export async function generateMetadata({ params }: FormPageProps) {
  const { formId } = await params;
  try {
    const user = await requireSessionUser();
    const form = await getAccessibleFormDetail(
      formId,
      user.uid,
      user.email,
    );
    return { title: form?.title ?? ui.formMetaTitle };
  } catch {
    return { title: ui.formMetaTitle };
  }
}

export default async function FormDetailPage({ params }: FormPageProps) {
  const { formId } = await params;
  const user = await requireSessionUser();
  const form = await getAccessibleFormDetail(formId, user.uid, user.email);

  if (!form) {
    notFound();
  }

  const responses =
    (await getAccessibleFormResponsesBundle(
      formId,
      user.uid,
      user.email,
    )) ?? {
      total: 0,
      items: [],
      summaries: [],
      analytics: {
        overview: {
          total: 0,
          completionRate: 0,
          csatScore: null,
          firstSubmittedAt: null,
          lastSubmittedAt: null,
        },
        scales: [],
        numbers: [],
        choices: [],
        texts: [],
      },
      submissions: [],
      attendance: [],
    };

  const siteOrigin = await getSiteOrigin();

  return (
    <FormWorkspace form={form} responses={responses} siteOrigin={siteOrigin} />
  );
}
