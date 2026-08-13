import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicFormFill } from "@/components/form-fill/public-form-fill";
import { getPublicFormBySlug } from "@/db/queries/public-forms";
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

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-6 py-10 sm:py-14">
      <Link
        href="/"
        className="w-fit font-[family-name:var(--font-fraunces)] text-lg font-semibold text-ink"
      >
        {ui.brand}
      </Link>

      <PublicFormFill form={form} />
    </main>
  );
}
