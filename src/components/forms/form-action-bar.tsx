"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFormStatusAction } from "@/app/actions/forms";
import type { FormDetail } from "@/db/queries/forms";
import { ui } from "@/lib/ui-id";

type FormActionBarProps = {
  form: FormDetail;
};

export function FormActionBar({ form }: FormActionBarProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function publicUrl() {
    if (!form.publicPath || typeof window === "undefined") return form.publicPath;
    return `${window.location.origin}${form.publicPath}`;
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
      if (path && typeof window !== "undefined") {
        try {
          await navigator.clipboard.writeText(
            `${window.location.origin}${path}`,
          );
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

  const statusLabel =
    form.status === "draft"
      ? ui.draft
      : form.status === "published"
        ? ui.live
        : ui.closed;

  return (
    <div className="sticky top-0 z-20 -mx-6 border-b border-border bg-bg/95 px-6 py-3 backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
              form.status === "published"
                ? "bg-accent/10 text-accent"
                : form.status === "closed"
                  ? "bg-border text-ink-muted"
                  : "bg-border/70 text-ink-muted"
            }`}
          >
            {statusLabel}
          </span>
          {form.publicPath ? (
            <span
              className="truncate font-mono text-xs text-ink-muted"
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

        <div className="flex flex-wrap gap-2">
          {form.status === "published" || form.publicPath ? (
            <>
              <button
                type="button"
                onClick={copyLink}
                disabled={!form.publicPath}
                className="inline-flex min-h-11 items-center rounded-md border border-border bg-bg-elevated px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-50"
              >
                {copied ? ui.copied : ui.copyLink}
              </button>
              {form.publicPath ? (
                <a
                  href={form.publicPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center rounded-md border border-border bg-bg-elevated px-3 text-sm font-medium hover:border-ink-muted"
                >
                  {ui.openForm}
                </a>
              ) : null}
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
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-60"
            >
              {ui.close}
            </button>
          )}
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
