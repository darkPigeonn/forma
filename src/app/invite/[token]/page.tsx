import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";
import { InviteAcceptPanel } from "@/components/collaborators/invite-accept-panel";
import { getInvitePreview } from "@/db/queries/collaborators";
import { getSessionUser } from "@/lib/firebase/auth";
import { featureFlags } from "@/lib/feature-flags";
import { ui } from "@/lib/ui-id";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export const metadata = {
  title: ui.collaboratorInviteTitle,
};

export default async function InvitePage({ params }: InvitePageProps) {
  if (!featureFlags.collaborators) {
    notFound();
  }

  const { token } = await params;
  const preview = await getInvitePreview(token);
  if (!preview) {
    notFound();
  }

  const user = await getSessionUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="forma-section space-y-6">
        <div className="space-y-3">
          <BrandLogo href="/" size="md" layout="stacked" />
          <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
            {ui.collaboratorInviteTitle}
          </h1>
        </div>

        <InviteAcceptPanel
          token={token}
          formTitle={preview.formTitle}
          inviterName={preview.inviterName}
          inviteEmail={preview.email}
          status={preview.status}
          signedIn={Boolean(user)}
          userEmail={user?.email ?? null}
          formId={preview.formId}
        />
      </div>
    </main>
  );
}
