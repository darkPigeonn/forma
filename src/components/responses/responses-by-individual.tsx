"use client";

import type { ResponseDetail, ResponseListItem } from "@/db/queries/responses";
import { ui } from "@/lib/ui-id";

type ResponsesByIndividualProps = {
  items: ResponseListItem[];
  selectedId: string | null;
  detail: ResponseDetail | null;
  error: string | null;
  isPending: boolean;
  onOpenDetail: (responseId: string) => void;
  onCloseDetail: () => void;
};

export function ResponsesByIndividual({
  items,
  selectedId,
  detail,
  error,
  isPending,
  onOpenDetail,
  onCloseDetail,
}: ResponsesByIndividualProps) {
  const selectedLabel = items.find((item) => item.id === selectedId)?.respondentLabel;

  if (selectedId) {
    return (
      <section
        className="space-y-4 rounded-xl border border-border bg-bg-elevated p-4"
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
            {selectedLabel ? (
              <p className="text-sm text-ink-muted">{selectedLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCloseDetail}
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
                  ? (answer.value as { name: string; url: string })
                  : null;

              return (
                <div
                  key={answer.questionId}
                  className="border-b border-border pb-3 last:border-b-0 last:pb-0"
                >
                  <dt className="text-sm font-medium text-ink">{answer.label}</dt>
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
    );
  }

  const sortedItems = [...items].sort((a, b) =>
    a.respondentLabel.localeCompare(b.respondentLabel, "id"),
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-elevated">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">{ui.individualResponses}</caption>
        <thead className="border-b border-border text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              {ui.respondentCol}
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
          {sortedItems.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-4 py-3 font-medium text-ink">
                {item.respondentLabel}
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-ink-muted">
                {item.preview}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onOpenDetail(item.id)}
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
  );
}
