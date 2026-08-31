import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getSessionUser } from "@/lib/firebase/auth";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { ui } from "@/lib/ui-id";

export const metadata = {
  title: ui.createAccountMeta,
};

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="forma-section space-y-8">
      <div className="space-y-3">
        <BrandLogo href="/" size="md" layout="stacked" />
        <h1 className="text-lg text-ink-muted">{ui.signUpTitle}</h1>
      </div>
      <SignUpForm />
      </div>
    </main>
  );
}
