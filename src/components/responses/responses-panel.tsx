"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getResponseDetailAction } from "@/app/actions/responses";
import { ResponsesAnalysis } from "@/components/responses/responses-analysis";
import { ResponsesByIndividual } from "@/components/responses/responses-by-individual";
import { ResponsesByQuestion } from "@/components/responses/responses-by-question";
import type { FormDetail } from "@/db/queries/forms";
import type {
  FormResponsesBundle,
  ResponseDetail,
} from "@/db/queries/responses";
import {
  buildWorkspaceQuery,
  parseListMode,
  parseQuestionFilter,
  parseResponsesView,
  type ListMode,
  type ResponsesView,
} from "@/lib/form-workspace-url";
import { ui } from "@/lib/ui-id";

type ResponsesPanelProps = {
  form: FormDetail;
  bundle: FormResponsesBundle;
};

export function ResponsesPanel({ form, bundle }: ResponsesPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = parseResponsesView(searchParams.get("view"));
  const listMode = parseListMode(searchParams.get("list"));
  const [detailReturnMode, setDetailReturnMode] =
    useState<ListMode>(listMode);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tabs: Array<{ id: ResponsesView; label: string }> = [
    { id: "analysis", label: ui.tabAnalysis },
    { id: "list", label: ui.tabResponseList },
  ];

  const listTabs: Array<{ id: ListMode; label: string }> = [
    { id: "question", label: ui.tabResponseByQuestion },
    { id: "individual", label: ui.tabResponseByIndividual },
  ];

  function replaceResponsesUrl(
    responsesView: ResponsesView,
    nextListMode: ListMode = listMode,
    questionId?: string | null,
  ) {
    const href = `${pathname}${buildWorkspaceQuery(searchParams, {
      tab: "responses",
      responsesView,
      listMode: nextListMode,
      questionId:
        questionId !== undefined
          ? questionId
          : nextListMode === "question"
            ? parseQuestionFilter(searchParams.get("q"))
            : null,
    })}`;
    router.replace(href, { scroll: false });
  }

  function openDetail(responseId: string, returnMode: ListMode = listMode) {
    setDetailReturnMode(returnMode);
    setSelectedId(responseId);
    setError(null);
    setDetail(null);
    startTransition(async () => {
      const result = await getResponseDetailAction({
        formId: form.id,
        responseId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDetail(result.response);
    });
  }

  function closeDetail() {
    replaceResponsesUrl("list", detailReturnMode);
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
    <div className="space-y-6">
      {view !== "analysis" ? (
        <div className="forma-section flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl font-semibold">
              {ui.responses}
            </h2>
            <p className="text-sm text-ink-muted">
              {ui.responseCount(bundle.total)}
            </p>
          </div>
          <a
            href={`/api/forms/${form.id}/responses/export`}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-bg-elevated px-4 text-sm font-medium hover:border-ink-muted"
          >
            {ui.exportCsv}
          </a>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label={ui.responses}
        className="flex flex-wrap gap-1 border-b border-border print:hidden"
      >
        {tabs.map((tab) => {
          const selected = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                replaceResponsesUrl(
                  tab.id,
                  listMode,
                  tab.id === "list" ? undefined : null,
                );
                if (tab.id !== "list") {
                  setSelectedId(null);
                  setDetail(null);
                  setError(null);
                }
              }}
              className={`min-h-11 border-b-2 px-4 text-sm font-medium transition ${
                selected
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {view === "analysis" ? (
        <div role="tabpanel">
          <ResponsesAnalysis
            form={form}
            questions={form.questions}
            submissions={bundle.submissions}
          />
        </div>
      ) : null}

      {view === "list" ? (
        <div role="tabpanel" className="space-y-4">
          {!selectedId ? (
            <div
              role="tablist"
              aria-label={ui.tabResponseList}
              className="inline-flex rounded-xl border border-border bg-bg-elevated p-1"
            >
              {listTabs.map((tab) => {
                const selected = listMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => replaceResponsesUrl("list", tab.id, null)}
                    className={`min-h-10 rounded-lg px-4 text-sm font-medium transition ${
                      selected
                        ? "bg-bg-elevated text-ink shadow-sm shadow-black/[0.04]"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {listMode === "question" && !selectedId ? (
            <ResponsesByQuestion
              questions={form.questions}
              submissions={bundle.submissions}
              onViewResponse={(id) => openDetail(id, "question")}
            />
          ) : null}

          {(listMode === "individual" && !selectedId) || selectedId ? (
            <ResponsesByIndividual
              items={bundle.items}
              selectedId={selectedId}
              detail={detail}
              error={error}
              isPending={isPending}
              onOpenDetail={openDetail}
              onCloseDetail={closeDetail}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
