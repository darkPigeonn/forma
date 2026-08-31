"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { saveFormQuestionsAction } from "@/app/actions/forms";
import { QuestionEditor } from "@/components/form-builder/question-editor";
import { FormTitleEditor } from "@/components/forms/form-title-editor";
import {
  createQuestion,
  createSection,
  duplicateQuestion,
  ensureFormStructure,
  normalizeFormStructure,
} from "@/domain/forms";
import {
  MAX_FORM_SECTIONS,
  type QuestionType,
} from "@/lib/form-constants";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";
import { saveFormQuestionsSchema } from "@/lib/validators/question";
import { ui } from "@/lib/ui-id";

const AUTOSAVE_MS = 600;

type FormBuilderProps = {
  formId: string;
  title: string;
  description: string;
  initialQuestions: QuestionInput[];
  initialSections: SectionInput[];
  onStructureChange?: (next: {
    questions: QuestionInput[];
    sections: SectionInput[];
  }) => void;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type BuilderState = {
  sections: SectionInput[];
  questions: QuestionInput[];
};

type Selection =
  | { kind: "title" }
  | { kind: "section"; id: string }
  | { kind: "question"; id: string };

export function FormBuilder({
  formId,
  title,
  description,
  initialQuestions,
  initialSections,
  onStructureChange,
}: FormBuilderProps) {
  const [state, setState] = useState<BuilderState>(() =>
    ensureFormStructure(initialQuestions, initialSections),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "title" });

  const stateRef = useRef(state);
  const skipFirstSave = useRef(true);
  const savedSnapshot = useRef(
    JSON.stringify(ensureFormStructure(initialQuestions, initialSections)),
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    onStructureChange?.(stateRef.current);
  }, [onStructureChange]);

  const persist = useCallback(
    async (next: BuilderState) => {
      const payload = normalizeFormStructure(next.sections, next.questions);
      const snapshot = JSON.stringify(payload);
      if (snapshot === savedSnapshot.current) {
        return;
      }

      const local = saveFormQuestionsSchema.safeParse({
        formId,
        questions: payload.questions,
        sections: payload.sections,
      });
      if (!local.success) {
        setSaveState("error");
        setError(local.error.issues[0]?.message ?? ui.fixQuestionErrors);
        return;
      }

      setSaveState("saving");
      setError(null);
      const result = await saveFormQuestionsAction(local.data);

      if (!result.ok) {
        setSaveState("error");
        setError(result.error);
        return;
      }

      savedSnapshot.current = snapshot;
      setSaveState("saved");
    },
    [formId],
  );

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }

    const handle = window.setTimeout(() => {
      void persist(stateRef.current);
    }, AUTOSAVE_MS);

    return () => window.clearTimeout(handle);
  }, [state, persist]);

  function commit(next: BuilderState) {
    const normalized = normalizeFormStructure(next.sections, next.questions);
    setState(normalized);
    onStructureChange?.(normalized);
  }

  function updateQuestion(questionId: string, question: QuestionInput) {
    commit({
      ...state,
      questions: state.questions.map((item) =>
        item.id === questionId ? question : item,
      ),
    });
  }

  function deleteQuestion(questionId: string) {
    if (state.questions.length <= 1) return;
    const index = state.questions.findIndex((item) => item.id === questionId);
    const remaining = state.questions.filter((item) => item.id !== questionId);
    commit({ ...state, questions: remaining });
    const neighbor =
      remaining[Math.min(index, remaining.length - 1)] ?? remaining[0];
    if (neighbor) setSelection({ kind: "question", id: neighbor.id });
  }

  function moveQuestion(questionId: string, direction: -1 | 1) {
    const questions = [...state.questions];
    const index = questions.findIndex((item) => item.id === questionId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= questions.length) {
      return;
    }

    const current = questions[index]!;
    const target = questions[targetIndex]!;
    if (current.sectionId === target.sectionId) {
      [questions[index], questions[targetIndex]] = [target, current];
      commit({ ...state, questions });
      return;
    }

    const [item] = questions.splice(index, 1);
    questions.splice(index, 0, {
      ...item!,
      sectionId: target.sectionId,
    });
    commit({ ...state, questions });
  }

  function addQuestion(
    sectionId: string,
    type: QuestionType = "short_text",
    afterQuestionId?: string,
    atStart = false,
  ) {
    const questions = [...state.questions];
    let insertAt = questions.length;
    if (afterQuestionId) {
      const index = questions.findIndex((item) => item.id === afterQuestionId);
      insertAt = index >= 0 ? index + 1 : questions.length;
    } else if (atStart) {
      const first = questions.findIndex((item) => item.sectionId === sectionId);
      insertAt = first >= 0 ? first : 0;
    } else {
      insertAt =
        questions.reduce(
          (acc, question, index) =>
            question.sectionId === sectionId ? index : acc,
          -1,
        ) + 1;
    }
    const created = createQuestion(type, 0, sectionId);
    questions.splice(Math.max(insertAt, 0), 0, created);
    commit({ ...state, questions });
    setSelection({ kind: "question", id: created.id });
  }

  function duplicateAt(questionId: string) {
    const index = state.questions.findIndex((item) => item.id === questionId);
    if (index < 0) return;
    const copy = duplicateQuestion(state.questions[index]!);
    const questions = [...state.questions];
    questions.splice(index + 1, 0, copy);
    commit({ ...state, questions });
    setSelection({ kind: "question", id: copy.id });
  }

  function updateSection(sectionId: string, patch: Partial<SectionInput>) {
    commit({
      ...state,
      sections: state.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    });
  }

  function addSectionAfter(sectionIndex: number) {
    if (state.sections.length >= MAX_FORM_SECTIONS) return;
    const section = createSection(sectionIndex + 1);
    const sections = [...state.sections];
    sections.splice(sectionIndex + 1, 0, section);
    const lastQuestionIndex = state.questions.reduce(
      (acc, question, index) =>
        question.sectionId === state.sections[sectionIndex]?.id ? index : acc,
      -1,
    );
    const created = createQuestion("short_text", 0, section.id);
    const questions = [...state.questions];
    questions.splice(lastQuestionIndex + 1, 0, created);
    commit({ sections, questions });
    setSelection({ kind: "section", id: section.id });
  }

  function deleteSection(sectionId: string) {
    if (state.sections.length <= 1) return;
    const sectionQuestions = state.questions.filter(
      (question) => question.sectionId === sectionId,
    );
    const section = state.sections.find((item) => item.id === sectionId);
    if (sectionQuestions.length > 0) {
      const title = section?.title?.trim()
        ? `“${section.title.trim()}”`
        : "";
      const confirmed = title
        ? window.confirm(ui.deleteSectionConfirm(title, sectionQuestions.length))
        : window.confirm(
            ui.deleteUntitledSectionConfirm(sectionQuestions.length),
          );
      if (!confirmed) return;
    }

    const sections = state.sections.filter((item) => item.id !== sectionId);
    let questions = state.questions.filter(
      (question) => question.sectionId !== sectionId,
    );
    if (questions.length === 0) {
      questions = [createQuestion("short_text", 0, sections[0]!.id)];
    }
    commit({ sections, questions });
    setSelection({ kind: "title" });
  }

  function moveSection(sectionIndex: number, direction: -1 | 1) {
    const target = sectionIndex + direction;
    if (target < 0 || target >= state.sections.length) return;
    const sections = [...state.sections];
    const [item] = sections.splice(sectionIndex, 1);
    sections.splice(target, 0, item!);
    commit({ ...state, sections });
  }

  function toolbarAddQuestion() {
    if (selection.kind === "question") {
      const current = state.questions.find((item) => item.id === selection.id);
      if (current) {
        addQuestion(current.sectionId, "short_text", current.id);
        return;
      }
    }
    if (selection.kind === "section") {
      addQuestion(selection.id);
      return;
    }
    const firstSection = state.sections[0];
    if (firstSection) {
      addQuestion(firstSection.id, "short_text", undefined, true);
    }
  }

  function toolbarAddSection() {
    if (state.sections.length >= MAX_FORM_SECTIONS) return;
    let index = 0;
    if (selection.kind === "section") {
      index = state.sections.findIndex((item) => item.id === selection.id);
    } else if (selection.kind === "question") {
      const current = state.questions.find((item) => item.id === selection.id);
      index = state.sections.findIndex((item) => item.id === current?.sectionId);
    }
    addSectionAfter(Math.max(index, 0));
  }

  const statusText =
    saveState === "saving"
      ? ui.saving
      : saveState === "saved"
        ? ui.saved
        : saveState === "error"
          ? ui.saveFailed
          : null;

  const canAddSection = state.sections.length < MAX_FORM_SECTIONS;
  const showSectionHeaders = state.sections.length > 1;

  function renderToolbar() {
    return (
      <BuilderToolbar
        onAddQuestion={toolbarAddQuestion}
        onAddSection={toolbarAddSection}
        canAddSection={canAddSection}
      />
    );
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-8">
      <div className="flex justify-end">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {statusText}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mx-auto w-full max-w-[48rem] space-y-3">
        <WithToolbar active={selection.kind === "title"} toolbar={renderToolbar()}>
          <FormTitleEditor
            formId={formId}
            title={title}
            description={description}
            selected={selection.kind === "title"}
            onSelect={() => setSelection({ kind: "title" })}
          />
        </WithToolbar>

        {state.sections.map((section, sectionIndex) => {
          const sectionQuestions = state.questions.filter(
            (question) => question.sectionId === section.id,
          );
          return (
            <Fragment key={section.id}>
              {showSectionHeaders && sectionIndex > 0 ? (
                <div
                  className="flex items-center gap-3 py-2"
                  aria-hidden="true"
                >
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {ui.nextSectionBreak}
                  </p>
                  <div className="h-px flex-1 bg-border" />
                </div>
              ) : null}

              <div className="forma-section space-y-3">
              {showSectionHeaders ? (
                <WithToolbar
                  active={
                    selection.kind === "section" && selection.id === section.id
                  }
                  toolbar={renderToolbar()}
                >
                  <SectionHeader
                    section={section}
                    index={sectionIndex}
                    total={state.sections.length}
                    selected={
                      selection.kind === "section" &&
                      selection.id === section.id
                    }
                    onSelect={() =>
                      setSelection({ kind: "section", id: section.id })
                    }
                    onChange={(patch) => updateSection(section.id, patch)}
                    onDelete={() => deleteSection(section.id)}
                    onMoveUp={() => moveSection(sectionIndex, -1)}
                    onMoveDown={() => moveSection(sectionIndex, 1)}
                  />
                </WithToolbar>
              ) : null}

              {sectionQuestions.length === 0 ? (
                <p className="px-1 text-sm text-ink-muted">
                  {ui.emptySectionHint}
                </p>
              ) : (
                sectionQuestions.map((question) => {
                  const globalIndex = state.questions.findIndex(
                    (item) => item.id === question.id,
                  );
                  const isSelected =
                    selection.kind === "question" &&
                    selection.id === question.id;
                  return (
                    <WithToolbar
                      key={question.id}
                      active={isSelected}
                      toolbar={renderToolbar()}
                    >
                      <QuestionEditor
                        question={question}
                        index={globalIndex}
                        total={state.questions.length}
                        number={globalIndex + 1}
                        selected={isSelected}
                        canMoveUp={globalIndex > 0}
                        canMoveDown={
                          globalIndex < state.questions.length - 1
                        }
                        canDelete={state.questions.length > 1}
                        onSelect={() =>
                          setSelection({
                            kind: "question",
                            id: question.id,
                          })
                        }
                        onChange={(next) => updateQuestion(question.id, next)}
                        onDelete={() => deleteQuestion(question.id)}
                        onDuplicate={() => duplicateAt(question.id)}
                        onMoveUp={() => moveQuestion(question.id, -1)}
                        onMoveDown={() => moveQuestion(question.id, 1)}
                      />
                    </WithToolbar>
                  );
                })
              )}
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg-elevated/95 p-3 backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-[48rem] justify-center">
          {renderToolbar()}
        </div>
      </div>
    </div>
  );
}

function WithToolbar({
  active,
  toolbar,
  children,
}: {
  active: boolean;
  toolbar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {active ? (
        <div className="absolute top-0 left-[calc(100%+0.75rem)] hidden lg:block">
          {toolbar}
        </div>
      ) : null}
    </div>
  );
}

function BuilderToolbar({
  onAddQuestion,
  onAddSection,
  canAddSection,
}: {
  onAddQuestion: () => void;
  onAddSection: () => void;
  canAddSection: boolean;
}) {
  return (
    <div
      role="toolbar"
      aria-label={ui.formTools}
      className="flex gap-1 rounded-lg border border-border bg-bg-elevated p-1 shadow-sm lg:flex-col"
    >
      <button
        type="button"
        onClick={onAddQuestion}
        className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-border/40"
        aria-label={ui.addQuestionTool}
        title={ui.addQuestionTool}
      >
        <PlusIcon />
      </button>
      <button
        type="button"
        onClick={onAddSection}
        disabled={!canAddSection}
        className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-border/40 disabled:opacity-40"
        aria-label={ui.addSectionTool}
        title={
          canAddSection ? ui.addSectionTool : ui.maxSectionsReached
        }
      >
        <SectionIcon />
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"
      />
    </svg>
  );
}

function SectionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 4h14v4H5V4zm0 6h14v2H5v-2zm0 4h14v6H5v-6z"
      />
    </svg>
  );
}

function SectionHeader({
  section,
  index,
  total,
  selected,
  onSelect,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  section: SectionInput;
  index: number;
  total: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<SectionInput>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const sectionNum = index + 1;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-bg-elevated transition ${
        selected
          ? "border-accent shadow-sm ring-1 ring-accent/20"
          : "cursor-pointer border-border hover:border-ink-muted/50"
      }`}
      onClick={() => {
        if (!selected) onSelect();
      }}
    >
      {selected ? (
        <div className="absolute inset-y-0 left-0 w-1 bg-accent" aria-hidden="true" />
      ) : null}
      <div className="border-b border-border bg-bg-elevated px-5 py-2 pl-6">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {ui.sectionPageOf(sectionNum, total)}
        </p>
      </div>
      <div className="space-y-3 p-5 pl-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm disabled:opacity-40 hover:bg-border/40"
              aria-label={ui.moveSectionUp(sectionNum)}
              title={ui.moveUp}
            >
              {ui.moveUp}
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index >= total - 1}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm disabled:opacity-40 hover:bg-border/40"
              aria-label={ui.moveSectionDown(sectionNum)}
              title={ui.moveDown}
            >
              {ui.moveDown}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={total <= 1}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-danger disabled:opacity-40 hover:bg-border/40"
              aria-label={ui.deleteSectionN(sectionNum)}
              title={total <= 1 ? ui.keepOneSection : ui.deleteSection}
            >
              {ui.delete}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor={titleId} className="text-xs font-medium text-ink-muted">
            {ui.sectionTitle}
          </label>
          <input
            id={titleId}
            value={section.title}
            onFocus={onSelect}
            onChange={(event) => onChange({ title: event.target.value })}
            className="w-full border-0 border-b border-border bg-transparent py-1 text-lg font-semibold outline-none focus:border-accent"
            maxLength={200}
            placeholder={ui.sectionTitlePlaceholder}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor={descriptionId} className="text-xs font-medium text-ink-muted">
            {ui.sectionDescription}{" "}
            <span className="font-normal">{ui.sectionDescriptionOptional}</span>
          </label>
          <textarea
            id={descriptionId}
            value={section.description}
            onFocus={onSelect}
            onChange={(event) => onChange({ description: event.target.value })}
            className="w-full resize-y border-0 bg-transparent py-1 text-sm text-ink-muted outline-none"
            rows={2}
            maxLength={2000}
            placeholder={ui.sectionDescriptionPlaceholder}
          />
        </div>
      </div>
    </div>
  );
}
