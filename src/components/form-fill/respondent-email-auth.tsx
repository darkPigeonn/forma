"use client";

import { ui } from "@/lib/ui-id";

export type RespondentAuthState = {
  email: string;
  getIdToken: () => Promise<string>;
};

export function RespondentEmailBanner({
  email,
  onDismiss,
  pending,
  detecting,
}: {
  email?: string | null;
  onDismiss?: () => void;
  pending?: boolean;
  detecting?: boolean;
}) {
  if (detecting && !email) {
    return (
      <p className="text-sm text-ink-muted" aria-live="polite">
        {ui.respondentDetectingEmail}
      </p>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink">{ui.respondentFillingAs(email)}</p>
      {onDismiss ? (
        <button
          type="button"
          disabled={pending}
          onClick={onDismiss}
          className="text-sm font-medium text-accent underline-offset-2 hover:underline disabled:opacity-60"
        >
          {ui.respondentHideEmail}
        </button>
      ) : null}
    </div>
  );
}
