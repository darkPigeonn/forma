"use client";

import { useEffect, useId, useState, useTransition } from "react";
import {
  inviteCollaboratorAction,
  listCollaboratorsAction,
  removeCollaboratorAction,
} from "@/app/actions/collaborators";
import type { CollaboratorListItem } from "@/db/queries/collaborators";
import { ui } from "@/lib/ui-id";

type FormCollaboratorsSettingsProps = {
  formId: string;
};

export function FormCollaboratorsSettings({
  formId,
}: FormCollaboratorsSettingsProps) {
  const emailId = useId();
  const [items, setItems] = useState<CollaboratorListItem[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listCollaboratorsAction(formId);
      if (cancelled) return;
      if (result.ok) {
        setItems(result.items);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

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
      setInviteUrl(result.inviteUrl);
      setNotice(
        result.emailSent
          ? ui.collaboratorInvited
          : ui.collaboratorNoEmailConfigured,
      );
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

  async function copyInviteUrl() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice(ui.collaboratorInviteCopied);
    } catch {
      setError(ui.couldNotCopyLink);
    }
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

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-success" aria-live="polite">
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
            onClick={() => void copyInviteUrl()}
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
              <div className="flex items-center gap-2">
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
