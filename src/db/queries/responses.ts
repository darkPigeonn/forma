import { Types } from "mongoose";
import { connectDb } from "@/db/client";
import { Response } from "@/db/models/response";
import type { AnswerInput, AnswerValue } from "@/domain/answers";
import {
  buildChoiceSummaries,
  buildResponsesCsv,
  formatAnswerDisplay,
  type ChoiceQuestionSummary,
} from "@/domain/responses";
import { getOwnedForm } from "@/db/queries/forms";
import type { QuestionInput } from "@/lib/validators/question";
import type { FormDocument } from "@/db/models/form";
import { ui } from "@/lib/ui-id";
export type ResponseListItem = {
  id: string;
  submittedAt: string;
  preview: string;
};

export type ResponseAnswerView = {
  questionId: string;
  label: string;
  type: string;
  displayValue: string;
  value: AnswerValue;
};

export type ResponseDetail = {
  id: string;
  submittedAt: string;
  answers: ResponseAnswerView[];
};

export type FormResponsesBundle = {
  total: number;
  items: ResponseListItem[];
  summaries: ChoiceQuestionSummary[];
};

type LeanAnswer = {
  questionId: string;
  value?: unknown;
};

type LeanResponse = {
  _id: Types.ObjectId;
  submittedAt: Date;
  answers?: LeanAnswer[];
};

function asAnswerValue(value: unknown): AnswerValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value as string[];
  }
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "url" in value &&
    "name" in value &&
    "path" in value
  ) {
    const v = value as {
      name: string;
      url: string;
      size?: number;
      contentType?: string;
      path: string;
    };
    return {
      name: String(v.name),
      url: String(v.url),
      size: typeof v.size === "number" ? v.size : 0,
      contentType: String(v.contentType ?? "application/octet-stream"),
      path: String(v.path),
    };
  }
  return String(value);
}

function serializeFormQuestions(
  questions: FormDocument["questions"] | undefined,
): QuestionInput[] {
  return (questions ?? []).map(
    (
      q: {
        id: string;
        type: string;
        label: string;
        helpText?: string | null;
        required?: boolean | null;
        order?: number | null;
        options?: { choices?: { id: string; label: string }[] } | null;
      },
      index: number,
    ) => {
      const base: QuestionInput = {
        id: q.id,
        type: q.type as QuestionInput["type"],
        label: q.label,
        helpText: q.helpText ?? "",
        required: Boolean(q.required),
        order: typeof q.order === "number" ? q.order : index,
      };
      if (q.options?.choices?.length) {
        base.options = {
          choices: q.options.choices.map((c: { id: string; label: string }) => ({
            id: c.id,
            label: c.label,
          })),
        };
      }
      return base;
    },
  );
}

export async function createFormResponse(input: {
  formId: string;
  answers: AnswerInput[];
  userAgent?: string;
  ipHash?: string;
}) {
  await connectDb();

  return Response.create({
    formId: new Types.ObjectId(input.formId),
    submittedAt: new Date(),
    meta: {
      userAgent: input.userAgent?.slice(0, 500),
      ipHash: input.ipHash,
    },
    answers: input.answers.map((a) => ({
      questionId: a.questionId,
      value: a.value,
    })),
  });
}

async function loadOwnedResponses(formId: string, ownerId: string) {
  const form = await getOwnedForm(formId, ownerId);
  if (!form) return null;

  await connectDb();
  const docs = (await Response.find({ formId: form._id })
    .sort({ submittedAt: -1 })
    .lean()) as unknown as LeanResponse[];

  return { form, docs };
}

function questionMap(questions: QuestionInput[]) {
  return new Map(questions.map((q) => [q.id, q]));
}

export async function getOwnedFormResponsesBundle(
  formId: string,
  ownerId: string,
): Promise<FormResponsesBundle | null> {
  const loaded = await loadOwnedResponses(formId, ownerId);
  if (!loaded) return null;

  const { form, docs } = loaded;
  const questions = serializeFormQuestions(form.questions);
  const qMap = questionMap(questions);

  const serialized = docs.map((doc) => ({
    id: String(doc._id),
    submittedAt: new Date(doc.submittedAt).toISOString(),
    answers: (doc.answers ?? []).map((a) => ({
      questionId: a.questionId,
      value: asAnswerValue(a.value),
    })),
  }));

  const items: ResponseListItem[] = serialized.map((response) => {
    const firstAnswer = response.answers.find((a) => {
      if (a.value === null || a.value === "") return false;
      if (Array.isArray(a.value) && a.value.length === 0) return false;
      return true;
    });
    const question = firstAnswer
      ? qMap.get(firstAnswer.questionId)
      : undefined;
    const preview = firstAnswer
      ? formatAnswerDisplay(question, firstAnswer.value)
      : "—";

    return {
      id: response.id,
      submittedAt: response.submittedAt,
      preview: preview.slice(0, 120),
    };
  });

  return {
    total: serialized.length,
    items,
    summaries: buildChoiceSummaries(questions, serialized),
  };
}

export async function getOwnedResponseDetail(
  formId: string,
  responseId: string,
  ownerId: string,
): Promise<ResponseDetail | null> {
  if (!Types.ObjectId.isValid(responseId)) return null;

  const form = await getOwnedForm(formId, ownerId);
  if (!form) return null;

  await connectDb();
  const doc = (await Response.findOne({
    _id: responseId,
    formId: form._id,
  }).lean()) as LeanResponse | null;
  if (!doc) return null;

  const questions = serializeFormQuestions(form.questions);
  const qMap = questionMap(questions);
  const answerById = new Map<string, AnswerValue>(
    (doc.answers ?? []).map((a) => [a.questionId, asAnswerValue(a.value)]),
  );

  const ordered: ResponseAnswerView[] = [...questions]
    .sort((a, b) => a.order - b.order)
    .map((q) => {
      const value = answerById.get(q.id) ?? null;
      return {
        questionId: q.id,
        label: q.label,
        type: q.type,
        value,
        displayValue: formatAnswerDisplay(q, value),
      };
    });

  for (const [questionId, value] of answerById) {
    if (qMap.has(questionId)) continue;
    ordered.push({
      questionId,
      label: ui.deletedQuestion,
      type: "unknown",
      value,
      displayValue: formatAnswerDisplay(undefined, value),
    });
  }

  return {
    id: String(doc._id),
    submittedAt: new Date(doc.submittedAt).toISOString(),
    answers: ordered,
  };
}

export async function getOwnedResponsesCsv(
  formId: string,
  ownerId: string,
): Promise<{ filename: string; csv: string } | null> {
  const loaded = await loadOwnedResponses(formId, ownerId);
  if (!loaded) return null;

  const { form, docs } = loaded;
  const questions = serializeFormQuestions(form.questions);

  const responses = docs.map((doc) => ({
    submittedAt: new Date(doc.submittedAt).toISOString(),
    answers: (doc.answers ?? []).map((a) => ({
      questionId: a.questionId,
      value: asAnswerValue(a.value),
    })),
  }));

  const safeTitle =
    form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "form";

  return {
    filename: `${safeTitle}-responses.csv`,
    csv: buildResponsesCsv(questions, responses),
  };
}
