"use client";

import { Suspense, useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormBuilder } from "@/components/form-builder/form-builder";
import { FormActionBar } from "@/components/forms/form-action-bar";
import { FormPreviewPanel } from "@/components/forms/form-preview-panel";
import { FormSettingsPanel } from "@/components/forms/form-settings-panel";
import { ResponsesPanel } from "@/components/responses/responses-panel";
import type { FormDetail } from "@/db/queries/forms";
import type { FormResponsesBundle } from "@/db/queries/responses";
import {
  buildWorkspaceQuery,
  parseWorkspaceTab,
  type WorkspaceTab,
} from "@/lib/form-workspace-url";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";

type FormWorkspaceProps = {
  form: FormDetail;
  responses: FormResponsesBundle;
  siteOrigin: string;
};

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "questions", label: ui.tabQuestions },
  { id: "preview", label: ui.tabPreview },
  { id: "responses", label: ui.tabResponses },
  { id: "settings", label: ui.tabSettings },
];

function FormWorkspaceInner({ form, responses, siteOrigin }: FormWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseWorkspaceTab(searchParams.get("tab"));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [draft, setDraft] = useState<{
    questions: QuestionInput[];
    sections: SectionInput[];
  }>(() => ({
    questions: form.questions,
    sections: form.sections,
  }));

  const tabs = TABS.map((item) =>
    item.id === "responses" && responses.total > 0
      ? { ...item, label: ui.tabResponsesCount(responses.total) }
      : item,
  );

  function navigateToTab(next: WorkspaceTab) {
    const href = `${pathname}${buildWorkspaceQuery(searchParams, { tab: next })}`;
    router.replace(href, { scroll: false });
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((t) => t.id === tab);
    if (index < 0) return;

    let next = index;
    if (event.key === "ArrowRight") {
      next = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      next = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[next]!;
    navigateToTab(nextTab.id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="-mt-8 space-y-4">
      <FormActionBar form={form} siteOrigin={siteOrigin} />

      <div
        role="tablist"
        aria-label={ui.formSections}
        className="flex flex-wrap justify-center gap-1 border-b border-border print:hidden"
        onKeyDown={onTabKeyDown}
      >
        {tabs.map((item, index) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => navigateToTab(item.id)}
              className={`min-h-11 border-b-2 px-4 text-sm font-medium transition ${
                selected
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="panel-questions"
        aria-labelledby="tab-questions"
        hidden={tab !== "questions"}
      >
        <FormBuilder
          formId={form.id}
          title={form.title}
          description={form.description}
          initialQuestions={form.questions}
          initialSections={form.sections}
          onStructureChange={setDraft}
        />
      </div>

      <div
        role="tabpanel"
        id="panel-preview"
        aria-labelledby="tab-preview"
        hidden={tab !== "preview"}
      >
        {tab === "preview" ? (
          <FormPreviewPanel
            title={form.title}
            description={form.description}
            questions={draft.questions}
            sections={draft.sections}
            themeId={form.themeId}
            headerImage={form.headerImage}
          />
        ) : null}
      </div>

      <div
        role="tabpanel"
        id="panel-responses"
        aria-labelledby="tab-responses"
        hidden={tab !== "responses"}
      >
        {tab === "responses" ? (
          <ResponsesPanel form={form} bundle={responses} />
        ) : null}
      </div>

      <div
        role="tabpanel"
        id="panel-settings"
        aria-labelledby="tab-settings"
        hidden={tab !== "settings"}
      >
        {tab === "settings" ? <FormSettingsPanel form={form} /> : null}
      </div>
    </div>
  );
}

function FormWorkspaceFallback() {
  return (
    <div className="-mt-8 space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-14 animate-pulse rounded-xl border border-border bg-bg-elevated" />
      <div className="flex gap-2 border-b border-border pb-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-11 w-24 animate-pulse rounded-md bg-border/60"
          />
        ))}
      </div>
      <div className="min-h-[12rem] animate-pulse rounded-xl border border-border bg-bg-elevated" />
    </div>
  );
}

export function FormWorkspace(props: FormWorkspaceProps) {
  return (
    <Suspense fallback={<FormWorkspaceFallback />}>
      <FormWorkspaceInner {...props} />
    </Suspense>
  );
}
