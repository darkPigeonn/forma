import { CreateFormButton } from "@/components/forms/create-form-button";
import { CreateFromTemplate } from "@/components/forms/create-from-template";
import { FormsTable } from "@/components/forms/forms-table";
import { DashboardOnboarding } from "@/components/onboarding/dashboard-onboarding";
import { listFormsForUser } from "@/db/queries/forms";
import { requireSessionUser } from "@/lib/firebase/auth";
import { ui } from "@/lib/ui-id";

export const metadata = {
  title: ui.dashboardMeta,
};

export default async function DashboardPage() {
  const user = await requireSessionUser();
  const forms = await listFormsForUser(user.uid, user.email);

  return (
    <section className="space-y-6">
      <div className="forma-section flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold text-ink">
            {ui.yourForms}
          </h1>
          <p className="text-ink-muted">{ui.dashboardHint}</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <CreateFormButton />
          <CreateFromTemplate />
          <DashboardOnboarding
            showOnLoad={!user.profile.onboardingCompletedAt}
          />
        </div>
      </div>

      <FormsTable forms={forms} />
    </section>
  );
}
