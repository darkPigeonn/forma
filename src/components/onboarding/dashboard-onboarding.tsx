"use client";

import { useState } from "react";
import { OnboardingDialog } from "@/components/onboarding/onboarding-dialog";
import { ui } from "@/lib/ui-id";

type DashboardOnboardingProps = {
  showOnLoad: boolean;
};

export function DashboardOnboarding({ showOnLoad }: DashboardOnboardingProps) {
  const [open, setOpen] = useState(showOnLoad);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center text-sm font-medium text-accent hover:underline"
      >
        {ui.viewGuide}
      </button>
      <OnboardingDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
