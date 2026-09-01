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
import { getEditableForm } from "@/db/queries/form-access";
import type { QuestionInput } from "@/lib/validators/question";
import type { FormDocument } from "@/db/models/form";
import { fromPersistedQuestionOptions } from "@/lib/question-options";
import {
  buildAttendanceRows,
  type AttendanceRow,
} from "@/domain/attendance";
import { attachRespondentLabels } from "@/domain/respondent-label";
import {
  buildResponseAnalytics,
  type ResponseAnalytics,
  type ResponseSubmission,
} from "@/domain/response-analytics";
import { ui } from "@/lib/ui-id";
import {
  isFileAnswerValue,
  resolveFileAnswerUrl,
} from "@/lib/storage/form-uploads";
export type ResponseListItem = {
  id: string;
  submittedAt: string;
  respondentLabel: string;
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
  analytics: ResponseAnalytics;
  submissions: ResponseSubmission[];
  attendance: AttendanceRow[];
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
        sectionId?: string | null;
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
        sectionId: q.sectionId || "default",
      };
      const options = fromPersistedQuestionOptions(q.options);
      if (options) {
        base.options = options;
      }
      return base;
    },
  );
}

export async function hasResponseForRespondent(
  formId: string,
  respondentKey: string,
) {
  await connectDb();
  const found = await Response.exists({
    formId: new Types.ObjectId(formId),
    "meta.respondentKey": respondentKey,
  });
  return Boolean(found);
}

export async function hasResponseForUniqueKey(
  formId: string,
  uniqueKey: string,
) {
  await connectDb();
  const found = await Response.exists({
    formId: new Types.ObjectId(formId),
    "meta.uniqueKey": uniqueKey,
  });
  return Boolean(found);
}

export async function hasResponseForRespondentEmail(
  formId: string,
  respondentEmail: string,
) {
  await connectDb();
  const found = await Response.exists({
    formId: new Types.ObjectId(formId),
    "meta.respondentEmail": respondentEmail.trim().toLowerCase(),
  });
  return Boolean(found);
}

export async function createFormResponse(input: {
  formId: string;
  answers: AnswerInput[];
  userAgent?: string;
  ipHash?: string;
  respondentKey?: string;
  uniqueKey?: string;
  respondentEmail?: string;
  respondentUid?: string;
}): Promise<{ id: string; submittedAt: string }> {
  await connectDb();

  const doc = await Response.create({
    formId: new Types.ObjectId(input.formId),
    submittedAt: new Date(),
    meta: {
      userAgent: input.userAgent?.slice(0, 500),
      ipHash: input.ipHash,
      respondentKey: input.respondentKey,
      uniqueKey: input.uniqueKey,
      respondentEmail: input.respondentEmail?.trim().toLowerCase(),
      respondentUid: input.respondentUid,
    },
    answers: input.answers.map((a) => ({
      questionId: a.questionId,
      value: a.value,
    })),
  });
  return {
    id: String(doc._id),
    submittedAt: new Date(doc.submittedAt).toISOString(),
  };
}

async function loadAccessibleResponses(
  formId: string,
  userId: string,
  email: string,
) {
  const form = await getEditableForm(formId, userId, email);
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

export async function getAccessibleFormResponsesBundle(
  formId: string,
  userId: string,
  email: string,
): Promise<FormResponsesBundle | null> {
  const loaded = await loadAccessibleResponses(formId, userId, email);
  if (!loaded) return null;

  const { form, docs } = loaded;
  const questions = serializeFormQuestions(form.questions);
  const qMap = questionMap(questions);

  const serialized = attachRespondentLabels(
    questions,
    docs.map((doc) => ({
      id: String(doc._id),
      submittedAt: new Date(doc.submittedAt).toISOString(),
      respondentEmail:
        typeof doc.meta?.respondentEmail === "string"
          ? doc.meta.respondentEmail
          : undefined,
      answers: (doc.answers ?? []).map((a) => ({
        questionId: a.questionId,
        value: asAnswerValue(a.value),
      })),
    })),
  );

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
      respondentLabel: response.respondentLabel,
      preview: preview.slice(0, 120),
    };
  });

  return {
    total: serialized.length,
    items,
    summaries: buildChoiceSummaries(questions, serialized),
    analytics: buildResponseAnalytics(questions, serialized),
    submissions: serialized,
    attendance: buildAttendanceRows(questions, serialized),
  };
}

/** @deprecated Use getAccessibleFormResponsesBundle */
export async function getOwnedFormResponsesBundle(
  formId: string,
  ownerId: string,
): Promise<FormResponsesBundle | null> {
  return getAccessibleFormResponsesBundle(formId, ownerId, "");
}

export async function getAccessibleResponseDetail(
  formId: string,
  responseId: string,
  userId: string,
  email: string,
): Promise<ResponseDetail | null> {
  if (!Types.ObjectId.isValid(responseId)) return null;

  const form = await getEditableForm(formId, userId, email);
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

  const ordered: ResponseAnswerView[] = [];
  for (const q of [...questions].sort((a, b) => a.order - b.order)) {
    let value = answerById.get(q.id) ?? null;
    if (value && isFileAnswerValue(value)) {
      value = await resolveFileAnswerUrl(value);
    }
    ordered.push({
      questionId: q.id,
      label: q.label,
      type: q.type,
      value,
      displayValue: formatAnswerDisplay(q, value),
    });
  }

  for (const [questionId, rawValue] of answerById) {
    if (qMap.has(questionId)) continue;
    let value = rawValue;
    if (value && isFileAnswerValue(value)) {
      value = await resolveFileAnswerUrl(value);
    }
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

/** @deprecated Use getAccessibleResponseDetail */
export async function getOwnedResponseDetail(
  formId: string,
  responseId: string,
  ownerId: string,
): Promise<ResponseDetail | null> {
  return getAccessibleResponseDetail(formId, responseId, ownerId, "");
}

export async function getAccessibleResponsesCsv(
  formId: string,
  userId: string,
  email: string,
): Promise<{ filename: string; csv: string } | null> {
  const loaded = await loadAccessibleResponses(formId, userId, email);
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

/** @deprecated Use getAccessibleResponsesCsv */
export async function getOwnedResponsesCsv(
  formId: string,
  ownerId: string,
): Promise<{ filename: string; csv: string } | null> {
  return getAccessibleResponsesCsv(formId, ownerId, "");
}
