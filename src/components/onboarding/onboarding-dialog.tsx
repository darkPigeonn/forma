"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { completeOnboardingAction } from "@/app/actions/onboarding";
import { ui } from "@/lib/ui-id";

type OnboardingDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function OnboardingDialog({ open, onClose }: OnboardingDialogProps) {
  if (!open) return null;

  return <OnboardingDialogContent onClose={onClose} />;
}

function OnboardingDialogContent({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const steps = ui.onboardingSteps;
  const [step, setStep] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const total = steps.length;
  const current = steps[step]!;
  const isLast = step === total - 1;

  const finish = useCallback(async () => {
    await completeOnboardingAction();
    onClose();
  }, [onClose]);

  useEffect(() => {
    window.setTimeout(() => closeRef.current?.focus(), 0);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        void finish();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) void finish();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[min(36rem,100%)] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-bg-elevated p-5 shadow-sm sm:p-6"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {ui.onboardingStepOf(step + 1, total)}
        </p>
        <h2
          id={titleId}
          className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl font-semibold text-ink"
        >
          {current.title}
        </h2>
        <p className="mt-3 text-ink-muted">{current.body}</p>

        <ol className="mt-5 flex gap-1.5" aria-hidden="true">
          {steps.map((item, index) => (
            <li
              key={item.title}
              className={`h-1.5 flex-1 rounded-full ${
                index <= step ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            ref={closeRef}
            type="button"
            onClick={() => void finish()}
            className="inline-flex min-h-11 items-center text-sm font-medium text-ink-muted hover:text-ink"
          >
            {isLast ? ui.onboardingClose : ui.onboardingSkip}
          </button>
          <div className="flex flex-wrap gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((value) => value - 1)}
                className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:border-ink-muted"
              >
                {ui.onboardingBack}
              </button>
            ) : null}
            {isLast ? (
              <button
                type="button"
                onClick={() => void finish()}
                className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
              >
                {ui.onboardingStart}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((value) => value + 1)}
                className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
              >
                {ui.onboardingNext}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
