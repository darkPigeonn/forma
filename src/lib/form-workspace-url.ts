export const WORKSPACE_TABS = [
  "questions",
  "preview",
  "responses",
  "settings",
] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

export const RESPONSES_VIEWS = ["analysis", "list"] as const;

export type ResponsesView = (typeof RESPONSES_VIEWS)[number];

export const LIST_MODES = ["question", "individual"] as const;

export type ListMode = (typeof LIST_MODES)[number];

export function parseWorkspaceTab(value: string | null): WorkspaceTab {
  if (
    value === "preview" ||
    value === "responses" ||
    value === "settings"
  ) {
    return value;
  }
  return "questions";
}

export function parseResponsesView(value: string | null): ResponsesView {
  return value === "list" ? "list" : "analysis";
}

export function parseListMode(value: string | null): ListMode {
  return value === "individual" ? "individual" : "question";
}

type WorkspaceUrlUpdate = {
  tab: WorkspaceTab;
  responsesView?: ResponsesView;
  listMode?: ListMode;
  questionId?: string | null;
};

export function parseQuestionFilter(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Build query string for workspace navigation (preserves unrelated params). */
export function buildWorkspaceQuery(
  current: URLSearchParams,
  update: WorkspaceUrlUpdate,
): string {
  const params = new URLSearchParams(current.toString());

  if (update.tab === "questions") {
    params.delete("tab");
    params.delete("view");
    params.delete("list");
    params.delete("q");
  } else {
    params.set("tab", update.tab);
    if (update.tab !== "responses") {
      params.delete("view");
      params.delete("list");
      params.delete("q");
    }
  }

  if (update.tab === "responses") {
    const view = update.responsesView ?? parseResponsesView(params.get("view"));
    if (view === "analysis") {
      params.delete("view");
      params.delete("list");
      params.delete("q");
    } else {
      params.set("view", "list");
      const list = update.listMode ?? parseListMode(params.get("list"));
      if (list === "question") {
        params.delete("list");
      } else {
        params.set("list", list);
        params.delete("q");
      }

      if (list === "question" || !params.get("list")) {
        if (update.questionId === null) {
          params.delete("q");
        } else if (update.questionId) {
          params.set("q", update.questionId);
        }
      }
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
