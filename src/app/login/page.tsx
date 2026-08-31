import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getSessionUser } from "@/lib/firebase/auth";
import { LoginForm } from "@/components/auth/login-form";
import { ui } from "@/lib/ui-id";

export const metadata = {
  title: ui.signIn,
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function safeRedirectPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectPath(next);

  const user = await getSessionUser();
  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="forma-section space-y-8">
        <div className="space-y-3">
          <BrandLogo href="/" size="md" layout="stacked" />
          <h1 className="text-lg text-ink-muted">{ui.signInTitle}</h1>
        </div>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}
