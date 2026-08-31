"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFormAction,
  duplicateFormAction,
  setFormStatusAction,
} from "@/app/actions/forms";
import { FormShareMenu } from "@/components/forms/form-share-menu";
import type { FormDetail } from "@/db/queries/forms";
import { publicFormUrl } from "@/lib/share";
import { featureFlags } from "@/lib/feature-flags";
import { ui } from "@/lib/ui-id";

type FormActionBarProps = {
  form: FormDetail;
  siteOrigin: string;
};

const actionBtn =
  "inline-flex min-h-11 items-center rounded-md border border-border bg-bg-elevated px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-50";

export function FormActionBar({ form, siteOrigin }: FormActionBarProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function publicUrl() {
    if (!form.publicPath) return null;
    return publicFormUrl(form.publicPath, siteOrigin);
  }

  async function copyLink() {
    const url = publicUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(ui.couldNotCopyLink);
    }
  }

  function publish() {
    setError(null);
    startTransition(async () => {
      const result = await setFormStatusAction({
        formId: form.id,
        status: "published",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      const path = result.publicPath ?? form.publicPath;
      if (path) {
        try {
          await navigator.clipboard.writeText(publicFormUrl(path, siteOrigin));
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // ignore — publish still succeeded
        }
      }
    });
  }

  function closeForm() {
    setError(null);
    startTransition(async () => {
      const result = await setFormStatusAction({
        formId: form.id,
        status: "closed",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function duplicateForm() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateFormAction({ formId: form.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.formId) {
        router.push(`/forms/${result.formId}`);
      }
    });
  }

  function deleteForm() {
    if (!window.confirm(ui.deleteFormConfirm(form.title))) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteFormAction({ formId: form.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  const statusLabel =
    form.status === "draft"
      ? ui.draft
      : form.status === "published"
        ? ui.live
        : ui.closed;

  const canShare = form.status === "published" || Boolean(form.publicPath);
  const isOwner = form.accessRole === "owner";

  return (
    <div className="sticky top-0 z-30 -mx-6 border-b border-border bg-bg-elevated/95 px-6 py-3 backdrop-blur-sm print:hidden">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <Link
            href="/dashboard"
            className="shrink-0 font-medium text-accent hover:underline"
          >
            {ui.backToForms}
          </Link>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <span
            className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium ${
              form.status === "published"
                ? "bg-accent/10 text-accent"
                : form.status === "closed"
                  ? "bg-border text-ink-muted"
                  : "bg-border/70 text-ink-muted"
            }`}
          >
            {statusLabel}
          </span>
          {featureFlags.collaborators && form.accessRole === "editor" ? (
            <span className="inline-flex shrink-0 items-center rounded-md bg-border px-2 py-1 text-xs font-medium text-ink-muted">
              {ui.collaboratorEditorBadge}
            </span>
          ) : null}
          {form.publicPath ? (
            <span
              className="min-w-0 truncate font-mono text-xs text-ink-muted"
              title={`${ui.shortLink}: ${form.publicPath}`}
            >
              <span className="mr-1.5 font-sans text-ink-muted/80">
                {ui.shortLink}
              </span>
              {form.publicPath}
            </span>
          ) : (
            <span className="text-ink-muted">{ui.publishToGetLink}</span>
          )}
          <span className="sr-only" aria-live="polite">
            {copied ? ui.linkCopied : null}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canShare ? (
            <>
              <button
                type="button"
                onClick={() => void copyLink()}
                disabled={!form.publicPath || isPending}
                className={actionBtn}
              >
                {copied ? ui.copied : ui.copyLink}
              </button>
              {form.publicPath ? (
                <a
                  href={form.publicPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={actionBtn}
                >
                  {ui.openForm}
                </a>
              ) : null}
              <FormShareMenu
                title={form.title}
                description={form.description}
                publicPath={form.publicPath}
                siteOrigin={siteOrigin}
              />
            </>
          ) : null}

          {form.status === "draft" || form.status === "closed" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={publish}
              className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {isPending
                ? ui.publishing
                : form.status === "closed"
                  ? ui.reopen
                  : ui.publish}
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={closeForm}
              className={actionBtn}
            >
              {ui.close}
            </button>
          )}

          {isOwner ? (
            <FormMoreMenu
              disabled={isPending}
              onDuplicate={duplicateForm}
              onDelete={deleteForm}
            />
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {copied && form.status === "published" ? (
        <p className="mt-2 text-sm text-success" aria-live="polite">
          {ui.linkCopiedReady}
        </p>
      ) : null}
    </div>
  );
}

function FormMoreMenu({
  disabled,
  onDuplicate,
  onDelete,
}: {
  disabled: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <details className="relative">
      <summary
        className={`${actionBtn} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
      >
        {ui.moreActions}
      </summary>
      <div className="absolute right-0 z-50 mt-1 min-w-[11rem] rounded-md border border-border bg-bg-elevated py-1 shadow-sm shadow-black/5">
        <button
          type="button"
          disabled={disabled}
          onClick={onDuplicate}
          className="flex min-h-10 w-full items-center px-3 text-left text-sm hover:bg-border/30 disabled:opacity-60"
        >
          {ui.duplicate}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="flex min-h-10 w-full items-center px-3 text-left text-sm text-danger hover:bg-danger/5 disabled:opacity-60"
        >
          {ui.deleteForm}
        </button>
      </div>
    </details>
  );
}
