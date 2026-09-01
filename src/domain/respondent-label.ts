import { attendanceFieldMap } from "@/domain/attendance";
import type { AnswerValue } from "@/domain/answers";
import { answerToText } from "@/domain/unique-key";
import { ui } from "@/lib/ui-id";
import type { QuestionInput } from "@/lib/validators/question";

type SubmissionLike = {
  id: string;
  submittedAt: string;
  respondentEmail?: string;
  answers: Array<{ questionId: string; value: AnswerValue }>;
};

export function buildRespondentLabels(
  questions: QuestionInput[],
  submissions: SubmissionLike[],
): Map<string, string> {
  const fields = attendanceFieldMap(questions);
  const sorted = [...submissions].sort((a, b) =>
    a.submittedAt.localeCompare(b.submittedAt),
  );
  const usedNames = new Map<string, number>();
  const labels = new Map<string, string>();

  sorted.forEach((submission, index) => {
    const byId = new Map(
      submission.answers.map((answer) => [answer.questionId, answer.value] as const),
    );

    let label = submission.respondentEmail?.trim() ?? "";
    if (!label && fields.name) {
      label = answerToText(byId.get(fields.name.id) ?? null).trim();
    }
    if (!label && fields.contact) {
      label = answerToText(byId.get(fields.contact.id) ?? null).trim();
    }

    if (label) {
      const seen = usedNames.get(label) ?? 0;
      usedNames.set(label, seen + 1);
      if (seen > 0) {
        label = `${label} (${seen + 1})`;
      }
    } else {
      label = ui.respondentN(index + 1);
    }

    labels.set(submission.id, label);
  });

  return labels;
}

export function attachRespondentLabels<T extends SubmissionLike>(
  questions: QuestionInput[],
  submissions: T[],
): Array<T & { respondentLabel: string }> {
  const labels = buildRespondentLabels(questions, submissions);
  return submissions.map((submission) => ({
    ...submission,
    respondentLabel: labels.get(submission.id) ?? ui.respondentN(0),
  }));
}
