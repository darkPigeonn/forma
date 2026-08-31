"use client";

import { useEffect, useId, useState, useTransition } from "react";
import {
  getCollaboratorEmailStatusAction,
  getCollaboratorInviteUrlAction,
  inviteCollaboratorAction,
  listCollaboratorsAction,
  removeCollaboratorAction,
  resendCollaboratorInviteAction,
} from "@/app/actions/collaborators";
import type { CollaboratorListItem } from "@/db/queries/collaborators";
import type { SendCollaboratorInviteResult } from "@/lib/email/send-collaborator-invite";
import { ui } from "@/lib/ui-id";

type FormCollaboratorsSettingsProps = {
  formId: string;
};

function inviteNoticeForStatus(
  status: SendCollaboratorInviteResult["status"],
): string {
  switch (status) {
    case "sent":
      return ui.collaboratorInvited;
    case "not_configured":
      return ui.collaboratorNoEmailConfigured;
    case "failed":
      return ui.collaboratorInviteEmailFailed;
  }
}

export function FormCollaboratorsSettings({
  formId,
}: FormCollaboratorsSettingsProps) {
  const emailId = useId();
  const [items, setItems] = useState<CollaboratorListItem[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [listResult, emailStatus] = await Promise.all([
        listCollaboratorsAction(formId),
        getCollaboratorEmailStatusAction(),
      ]);
      if (cancelled) return;
      if (listResult.ok) {
        setItems(listResult.items);
      } else {
        setError(listResult.error);
      }
      if (emailStatus.ok) {
        setEmailConfigured(emailStatus.configured);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  function showInviteUrl(url: string, status: SendCollaboratorInviteResult["status"]) {
    setInviteUrl(url);
    setNotice(inviteNoticeForStatus(status));
  }

  async function copyInviteUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(ui.collaboratorInviteCopied);
    } catch {
      setError(ui.couldNotCopyLink);
    }
  }

  function invite() {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setNotice(null);
    setInviteUrl(null);
    startTransition(async () => {
      const result = await inviteCollaboratorAction({
        formId,
        email: trimmed,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail("");
      setItems((prev) => {
        const without = prev.filter((item) => item.id !== result.collaborator.id);
        return [...without, result.collaborator];
      });
      showInviteUrl(result.inviteUrl, result.emailStatus);
    });
  }

  function copyPendingInvite(collaboratorId: string) {
    setError(null);
    startTransition(async () => {
      const result = await getCollaboratorInviteUrlAction({
        formId,
        collaboratorId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInviteUrl(result.inviteUrl);
      await copyInviteUrl(result.inviteUrl);
    });
  }

  function resendInvite(collaboratorId: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await resendCollaboratorInviteAction({
        formId,
        collaboratorId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      showInviteUrl(result.inviteUrl, result.emailStatus);
    });
  }

  function remove(collaborator: CollaboratorListItem) {
    if (!window.confirm(ui.collaboratorRemoveConfirm(collaborator.email))) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await removeCollaboratorAction({
        formId,
        collaboratorId: collaborator.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== collaborator.id));
    });
  }

  return (
    <section className="forma-section space-y-4" aria-labelledby="collaborators-heading">
      <h2
        id="collaborators-heading"
        className="font-[family-name:var(--font-fraunces)] text-xl font-semibold"
      >
        {ui.collaborators}
      </h2>
      <p className="text-sm text-ink-muted">{ui.collaboratorsHint}</p>

      {!emailConfigured ? (
        <p className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink-muted">
          {ui.collaboratorNoEmailConfigured}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          className={`text-sm ${notice === ui.collaboratorInvited ? "text-success" : "text-ink-muted"}`}
          aria-live="polite"
        >
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor={emailId} className="text-sm font-medium">
            {ui.email}
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            value={email}
            disabled={isPending}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                invite();
              }
            }}
            placeholder={ui.collaboratorEmailPlaceholder}
            className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <button
          type="button"
          disabled={isPending || !email.trim()}
          onClick={invite}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {isPending ? ui.invitingCollaborator : ui.inviteCollaborator}
        </button>
      </div>

      {inviteUrl ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-bg px-3 py-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-ink-muted">
            {inviteUrl}
          </p>
          <button
            type="button"
            onClick={() => void copyInviteUrl(inviteUrl)}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted"
          >
            {ui.copyLink}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-muted">{ui.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{ui.collaboratorsHint}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.email}</p>
                {item.name ? (
                  <p className="truncate text-sm text-ink-muted">{item.name}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                    item.status === "active"
                      ? "bg-accent/10 text-accent"
                      : "bg-border text-ink-muted"
                  }`}
                >
                  {item.status === "active"
                    ? ui.collaboratorActive
                    : ui.collaboratorPending}
                </span>
                {item.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => copyPendingInvite(item.id)}
                      className="inline-flex min-h-10 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-60"
                    >
                      {ui.collaboratorCopyInviteLink}
                    </button>
                    {emailConfigured ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => resendInvite(item.id)}
                        className="inline-flex min-h-10 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-60"
                      >
                        {isPending
                          ? ui.collaboratorResendingInvite
                          : ui.collaboratorResendInvite}
                      </button>
                    ) : null}
                  </>
                ) : null}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(item)}
                  className="inline-flex min-h-10 items-center rounded-md border border-border px-3 text-sm font-medium text-danger hover:border-danger disabled:opacity-60"
                >
                  {ui.collaboratorRemove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
