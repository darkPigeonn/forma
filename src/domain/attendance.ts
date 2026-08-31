import {
  answerToText,
  isLikelyNameQuestion,
  isLikelyPhoneQuestion,
} from "@/domain/unique-key";
import type { AnswerValue } from "@/domain/answers";
import type { QuestionInput } from "@/lib/validators/question";

export type AttendanceRow = {
  id: string;
  submittedAt: string;
  name: string;
  contact: string;
};

function pickQuestion(
  questions: QuestionInput[],
  pred: (q: QuestionInput) => boolean,
): QuestionInput | undefined {
  return questions.find(pred);
}

export function attendanceFieldMap(questions: QuestionInput[]): {
  name?: QuestionInput;
  contact?: QuestionInput;
} {
  const name =
    pickQuestion(questions, isLikelyNameQuestion) ??
    questions.find((q) => q.type === "short_text");
  const contact =
    questions.find((q) => q.type === "email") ??
    pickQuestion(questions, isLikelyPhoneQuestion);
  return { name, contact };
}

export function buildAttendanceRows(
  questions: QuestionInput[],
  responses: Array<{
    id: string;
    submittedAt: string;
    answers: Array<{ questionId: string; value: AnswerValue }>;
  }>,
): AttendanceRow[] {
  const map = attendanceFieldMap(questions);
  return responses.map((response) => {
    const byId = new Map(response.answers.map((a) => [a.questionId, a.value]));
    return {
      id: response.id,
      submittedAt: response.submittedAt,
      name: map.name ? answerToText(byId.get(map.name.id) ?? null) : "",
      contact: map.contact
        ? answerToText(byId.get(map.contact.id) ?? null)
        : "",
    };
  });
}
