import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PublicFormFill } from "@/components/form-fill/public-form-fill";
import { BrandLogo } from "@/components/brand/brand-logo";
import { FormHeaderBanner } from "@/components/forms/form-header-banner";
import { getPublicFormBySlug } from "@/db/queries/public-forms";
import { hasResponseForRespondent } from "@/db/queries/responses";
import { formThemeStyle, resolveFormTheme } from "@/lib/form-theme";
import {
  hashRespondentToken,
  respondentCookieName,
} from "@/lib/respondent-cookie";
import { ui } from "@/lib/ui-id";

type PublicFormPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PublicFormPageProps) {
  const { slug } = await params;
  const form = await getPublicFormBySlug(slug);
  if (!form) {
    return { title: ui.formNotFound };
  }
  return {
    title: form.title,
    description: form.description || ui.respondTo(form.title),
  };
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params;
  const form = await getPublicFormBySlug(slug);

  if (!form) {
    notFound();
  }

  const theme = resolveFormTheme(form.themeId);
  let alreadySubmitted = false;
  if (form.limitOneResponse) {
    const token = (await cookies()).get(respondentCookieName(form.id))?.value;
    if (token) {
      alreadySubmitted = await hasResponseForRespondent(
        form.id,
        hashRespondentToken(token),
      );
    }
  }

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={formThemeStyle(form.themeId)}
    >
      <FormHeaderBanner
        headerImage={form.headerImage}
        themeHeaderColor={theme.header}
        title={form.title}
      />
      <main className="mx-auto flex w-full max-w-[48rem] flex-1 flex-col gap-8 px-6 py-10 sm:py-14">
        <BrandLogo href="/" size="sm" showWordmark={false} />

        <PublicFormFill form={form} alreadySubmitted={alreadySubmitted} />
      </main>
    </div>
  );
}
