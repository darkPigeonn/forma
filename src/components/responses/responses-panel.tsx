"use client";

import { useState, useTransition } from "react";
import { getResponseDetailAction } from "@/app/actions/responses";
import type {
  FormResponsesBundle,
  ResponseDetail,
} from "@/db/queries/responses";
import { formatDateTime } from "@/lib/format-date";
import { ui } from "@/lib/ui-id";

type ResponsesPanelProps = {
  formId: string;
  bundle: FormResponsesBundle;
};

export function ResponsesPanel({ formId, bundle }: ResponsesPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openDetail(responseId: string) {
    setSelectedId(responseId);
    setError(null);
    setDetail(null);
    startTransition(async () => {
      const result = await getResponseDetailAction({ formId, responseId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDetail(result.response);
    });
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setError(null);
  }

  if (bundle.total === 0) {
    return (
      <div
        className="rounded-md border border-dashed border-border bg-bg-elevated px-4 py-10 text-center text-ink-muted"
        role="status"
      >
        <p className="font-medium text-ink">{ui.noResponsesYet}</p>
        <p className="mt-1 text-sm">{ui.noResponsesHint}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold">
            {ui.responses}
          </h2>
          <p className="text-sm text-ink-muted">
            {ui.responseCount(bundle.total)}
          </p>
        </div>
        <a
          href={`/api/forms/${formId}/responses/export`}
          className="inline-flex min-h-11 items-center rounded-md border border-border bg-bg-elevated px-4 text-sm font-medium hover:border-ink-muted"
        >
          {ui.exportCsv}
        </a>
      </div>

      {bundle.summaries.length > 0 ? (
        <section className="space-y-4" aria-labelledby="summary-heading">
          <h3
            id="summary-heading"
            className="text-sm font-medium uppercase tracking-wide text-ink-muted"
          >
            {ui.summary}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {bundle.summaries.map((summary) => (
              <article
                key={summary.questionId}
                className="space-y-3 rounded-md border border-border bg-bg-elevated p-4"
              >
                <h4 className="font-medium text-ink">{summary.label}</h4>
                <ul className="space-y-2">
                  {summary.options.map((option) => (
                    <li key={option.id} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-ink">{option.label}</span>
                        <span className="shrink-0 text-ink-muted">
                          {option.count} · {option.percent}%
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-border"
                        role="presentation"
                      >
                        <div
                          className="h-full rounded-full bg-accent transition-[width] duration-200"
                          style={{ width: `${Math.min(option.percent, 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedId ? (
        <section
          className="space-y-4 rounded-md border border-border bg-bg-elevated p-4"
          aria-labelledby="response-detail-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="response-detail-heading"
                className="font-[family-name:var(--font-fraunces)] text-lg font-semibold"
              >
                {ui.responseDetail}
              </h3>
              {detail ? (
                <p className="text-sm text-ink-muted">
                  <time dateTime={detail.submittedAt}>
                    {formatDateTime(detail.submittedAt)}
                  </time>
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={closeDetail}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted"
            >
              {ui.backToList}
            </button>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          {isPending && !detail ? (
            <p className="text-sm text-ink-muted" aria-live="polite">
              {ui.loading}
            </p>
          ) : null}

          {detail ? (
            <dl className="space-y-4">
              {detail.answers.map((answer) => {
                const fileValue =
                  answer.value &&
                  typeof answer.value === "object" &&
                  !Array.isArray(answer.value) &&
                  "url" in answer.value
                    ? (answer.value as {
                        name: string;
                        url: string;
                      })
                    : null;

                return (
                  <div
                    key={answer.questionId}
                    className="border-b border-border pb-3 last:border-b-0 last:pb-0"
                  >
                    <dt className="text-sm font-medium text-ink">
                      {answer.label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-ink-muted">
                      {fileValue ? (
                        <a
                          href={fileValue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-accent hover:underline"
                        >
                          {fileValue.name || ui.downloadFile}
                        </a>
                      ) : answer.displayValue ? (
                        answer.displayValue
                      ) : (
                        <span className="italic">{ui.noAnswer}</span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : null}
        </section>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-bg-elevated">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">{ui.individualResponses}</caption>
            <thead className="border-b border-border text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  {ui.submitted}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {ui.previewCol}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">{ui.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {bundle.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3 text-ink-muted">
                    <time dateTime={item.submittedAt}>
                      {formatDateTime(item.submittedAt)}
                    </time>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-ink">
                    {item.preview}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(item.id)}
                      className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:border-ink-muted"
                    >
                      {ui.view}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
