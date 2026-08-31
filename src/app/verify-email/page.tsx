import { BrandLogo } from "@/components/brand/brand-logo";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import {
  guardVerifyEmailPage,
  requireAuthenticatedUser,
} from "@/lib/auth/require-ready-user";
import { ui } from "@/lib/ui-id";

export const metadata = {
  title: ui.verifyEmailTitle,
};

export default async function VerifyEmailPage() {
  const user = await requireAuthenticatedUser();
  guardVerifyEmailPage(user);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="forma-section space-y-8">
        <div className="space-y-3">
          <BrandLogo href="/" size="md" layout="stacked" />
          <h1 className="text-lg text-ink-muted">{ui.verifyEmailTitle}</h1>
        </div>
        <VerifyEmailPanel email={user.email} />
      </div>
    </main>
  );
}
