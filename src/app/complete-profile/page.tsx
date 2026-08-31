import { BrandLogo } from "@/components/brand/brand-logo";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import {
  guardCompleteProfilePage,
  requireAuthenticatedUser,
} from "@/lib/auth/require-ready-user";
import { ui } from "@/lib/ui-id";

export const metadata = {
  title: ui.completeProfileTitle,
};

export default async function CompleteProfilePage() {
  const user = await requireAuthenticatedUser();
  guardCompleteProfilePage(user);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="forma-section space-y-8">
        <div className="space-y-3">
          <BrandLogo href="/" size="md" layout="stacked" />
          <h1 className="text-lg text-ink-muted">{ui.completeProfileTitle}</h1>
        </div>
        <CompleteProfileForm
          initialName={user.name}
          initialPhone={user.phone}
        />
      </div>
    </main>
  );
}
