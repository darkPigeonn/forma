"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptInviteAction } from "@/app/actions/collaborators";
import { ui } from "@/lib/ui-id";

type InviteAcceptPanelProps = {
  token: string;
  formTitle: string;
  inviterName: string;
  inviteEmail: string;
  status: "pending" | "active";
  signedIn: boolean;
  userEmail: string | null;
  formId: string;
};

export function InviteAcceptPanel({
  token,
  formTitle,
  inviterName,
  inviteEmail,
  status,
  signedIn,
  userEmail,
  formId,
}: InviteAcceptPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const emailMatches =
    signedIn &&
    userEmail &&
    userEmail.trim().toLowerCase() === inviteEmail.trim().toLowerCase();

  if (signedIn && status === "active" && emailMatches) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          {ui.collaboratorInviteAlreadyActive}
        </p>
        <Link
          href={`/forms/${formId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          {ui.collaboratorInviteOpenForm}
        </Link>
      </div>
    );
  }

  if (!signedIn) {
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          {ui.collaboratorInviteBody(inviterName, formTitle)}
        </p>
        <Link
          href={`/login?next=${next}`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover"
        >
          {ui.collaboratorInviteSignIn}
        </Link>
      </div>
    );
  }

  if (!emailMatches) {
    return (
      <p role="alert" className="text-sm text-danger">
        {ui.collaboratorInviteWrongAccount(inviteEmail)}
      </p>
    );
  }

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInviteAction({ token });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/forms/${result.formId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        {ui.collaboratorInviteBody(inviterName, formTitle)}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        onClick={accept}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {isPending ? ui.collaboratorInviteAccepting : ui.collaboratorInviteAccept}
      </button>
    </div>
  );
}
