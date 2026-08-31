import type { QuestionInput } from "@/lib/validators/question";

type PersistedQuestionOptions = {
  choices?: Array<{ id: string; label: string }>;
  range?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
};

export function toPersistedQuestionOptions(
  options: QuestionInput["options"] | undefined,
): PersistedQuestionOptions | undefined {
  if (!options) return undefined;

  const persisted: PersistedQuestionOptions = {};

  if (options.choices?.length) {
    persisted.choices = options.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
    }));
  }

  if (options.range) {
    persisted.range = {
      min: options.range.min,
      max: options.range.max,
      minLabel: options.range.minLabel ?? "",
      maxLabel: options.range.maxLabel ?? "",
    };
  }

  return Object.keys(persisted).length ? persisted : undefined;
}

export function fromPersistedQuestionOptions(
  options:
    | {
        choices?: Array<{ id: string; label: string }> | null;
        range?: {
          min: number;
          max: number;
          minLabel?: string | null;
          maxLabel?: string | null;
        } | null;
      }
    | null
    | undefined,
): QuestionInput["options"] | undefined {
  if (!options) return undefined;

  const parsed: NonNullable<QuestionInput["options"]> = {};

  if (options.choices?.length) {
    parsed.choices = options.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
    }));
  }

  if (
    options.range &&
    Number.isFinite(options.range.min) &&
    Number.isFinite(options.range.max)
  ) {
    parsed.range = {
      min: Math.trunc(options.range.min),
      max: Math.trunc(options.range.max),
      minLabel: options.range.minLabel ?? "",
      maxLabel: options.range.maxLabel ?? "",
    };
  }

  return Object.keys(parsed).length ? parsed : undefined;
}
