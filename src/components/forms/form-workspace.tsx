"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { FormBuilder } from "@/components/form-builder/form-builder";
import { FormActionBar } from "@/components/forms/form-action-bar";
import { FormSettingsPanel } from "@/components/forms/form-settings-panel";
import { FormTitleEditor } from "@/components/forms/form-title-editor";
import { ResponsesPanel } from "@/components/responses/responses-panel";
import type { FormDetail } from "@/db/queries/forms";
import type { FormResponsesBundle } from "@/db/queries/responses";
import { ui } from "@/lib/ui-id";

type FormWorkspaceProps = {
  form: FormDetail;
  responses: FormResponsesBundle;
};

type Tab = "questions" | "responses" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "questions", label: ui.tabQuestions },
  { id: "responses", label: ui.tabResponses },
  { id: "settings", label: ui.tabSettings },
];

export function FormWorkspace({ form, responses }: FormWorkspaceProps) {
  const [tab, setTab] = useState<Tab>("questions");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tabs = TABS.map((item) =>
    item.id === "responses" && responses.total > 0
      ? { ...item, label: ui.tabResponsesCount(responses.total) }
      : item,
  );

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
    setTab(nextTab.id);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="space-y-4">
      <FormActionBar form={form} />

      <FormTitleEditor
        formId={form.id}
        title={form.title}
        description={form.description}
      />

      <div
        role="tablist"
        aria-label={ui.formSections}
        className="flex flex-wrap gap-1 border-b border-border"
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
              onClick={() => setTab(item.id)}
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
        {tab === "questions" ? (
          <FormBuilder
            formId={form.id}
            title={form.title}
            description={form.description}
            initialQuestions={form.questions}
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
          <ResponsesPanel formId={form.id} bundle={responses} />
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
