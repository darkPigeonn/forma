"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteFormAction,
  duplicateFormAction,
} from "@/app/actions/forms";
import { CreateFormButton } from "@/components/forms/create-form-button";
import type { FormListItem } from "@/db/queries/forms";
import { formatDateTime } from "@/lib/format-date";
import { ui } from "@/lib/ui-id";

const statusLabel: Record<FormListItem["status"], string> = {
  draft: ui.draft,
  published: ui.live,
  closed: ui.closed,
};

type FormsTableProps = {
  forms: FormListItem[];
};

export function FormsTable({ forms }: FormsTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(
    formId: string,
    action: () => Promise<{ ok: boolean; error?: string; formId?: string }>,
    onSuccess?: (result: { formId?: string }) => void,
  ) {
    setError(null);
    setPendingId(formId);
    startTransition(async () => {
      const result = await action();
      setPendingId(null);
      if (!result.ok) {
        setError(result.error ?? ui.somethingWentWrongGeneric);
        return;
      }
      onSuccess?.(result);
      router.refresh();
    });
  }

  async function copyPublicLink(form: FormListItem) {
    if (!form.publicPath) return;
    const url = `${window.location.origin}${form.publicPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(form.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setError(ui.couldNotCopyLink);
    }
  }

  if (forms.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-md border border-dashed border-border bg-bg-elevated px-4 py-12 text-center"
        role="status"
      >
        <div className="space-y-1">
          <p className="font-medium text-ink">{ui.noFormsYet}</p>
          <p className="text-sm text-ink-muted">{ui.noFormsHint}</p>
        </div>
        <CreateFormButton />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-border bg-bg-elevated">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{ui.yourFormsCaption}</caption>
          <thead className="border-b border-border text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {ui.title}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {ui.status}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {ui.updated}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">{ui.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => {
              const busy = isPending && pendingId === form.id;
              return (
                <tr
                  key={form.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/forms/${form.id}`}
                      className="font-medium text-ink hover:text-accent"
                    >
                      {form.title}
                    </Link>
                    <p className="text-xs text-ink-muted">
                      {ui.questionsCount(form.questionCount)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {statusLabel[form.status]}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    <time dateTime={form.updatedAt}>
                      {formatDateTime(form.updatedAt)}
                    </time>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {form.status === "published" && form.publicPath ? (
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-60"
                          onClick={() => copyPublicLink(form)}
                        >
                          {copiedId === form.id ? ui.copied : ui.copyLink}
                        </button>
                      ) : null}
                      <Link
                        href={`/forms/${form.id}`}
                        className="inline-flex min-h-11 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-hover"
                      >
                        {form.status === "draft" ? ui.edit : ui.open}
                      </Link>
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted disabled:opacity-60"
                        onClick={() =>
                          runAction(
                            form.id,
                            () => duplicateFormAction({ formId: form.id }),
                            (result) => {
                              if (result.formId) {
                                router.push(`/forms/${result.formId}`);
                              }
                            },
                          )
                        }
                      >
                        {ui.duplicate}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium text-danger hover:border-danger disabled:opacity-60"
                        onClick={() => {
                          if (!window.confirm(ui.deleteConfirm(form.title))) {
                            return;
                          }
                          runAction(form.id, () =>
                            deleteFormAction({ formId: form.id }),
                          );
                        }}
                      >
                        {ui.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
