import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/auth";
import { LoginForm } from "@/components/auth/login-form";
import { ui } from "@/lib/ui-id";

export const metadata = {
  title: ui.signIn,
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="space-y-2">
        <Link
          href="/"
          className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ink"
        >
          {ui.brand}
        </Link>
        <h1 className="text-lg text-ink-muted">{ui.signInTitle}</h1>
      </div>
      <LoginForm />
    </main>
  );
}
