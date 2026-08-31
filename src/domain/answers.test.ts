import { describe, expect, it } from "vitest";
import {
  isValidFormUploadPath,
  validateAnswersAgainstQuestions,
  type AnswerInput,
} from "@/domain/answers";
import type { QuestionInput } from "@/lib/validators/question";

const FORM_ID = "507f1f77bcf86cd799439011";
const SECTION_ID = "section-1";

function question(
  overrides: Partial<QuestionInput> & Pick<QuestionInput, "id" | "type">,
): QuestionInput {
  return {
    label: "Label",
    helpText: "",
    required: false,
    order: 0,
    sectionId: SECTION_ID,
    ...overrides,
  };
}

function fileAnswer(questionId: string, formId: string): AnswerInput["value"] {
  return {
    name: "bukti.pdf",
    url: "s3://bucket/form-uploads/example",
    size: 1024,
    contentType: "application/pdf",
    path: `form-uploads/${formId}/${questionId}/abc-bukti.pdf`,
  };
}

describe("isValidFormUploadPath", () => {
  it("accepts paths for the matching form and question", () => {
    expect(isValidFormUploadPath("form-uploads/f1/q1/x.pdf", "f1", "q1")).toBe(
      true,
    );
  });

  it("rejects paths from another form", () => {
    expect(isValidFormUploadPath("form-uploads/f2/q1/x.pdf", "f1", "q1")).toBe(
      false,
    );
  });

  it("rejects paths from another question on the same form", () => {
    expect(isValidFormUploadPath("form-uploads/f1/q2/x.pdf", "f1", "q1")).toBe(
      false,
    );
  });
});

describe("validateAnswersAgainstQuestions", () => {
  it("normalizes optional blank answers to null", () => {
    const questions = [
      question({ id: "q1", type: "short_text", required: false }),
    ];
    const result = validateAnswersAgainstQuestions(FORM_ID, questions, []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.answers).toEqual([{ questionId: "q1", value: null }]);
    }
  });

  it("rejects missing required answers", () => {
    const questions = [
      question({ id: "q1", type: "short_text", required: true }),
    ];
    const result = validateAnswersAgainstQuestions(FORM_ID, questions, []);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid email", () => {
    const questions = [question({ id: "q1", type: "email", required: true })];
    const result = validateAnswersAgainstQuestions(FORM_ID, questions, [
      { questionId: "q1", value: "not-an-email" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects multiple choice values outside allowed options", () => {
    const questions = [
      question({
        id: "q1",
        type: "multiple_choice",
        required: true,
        options: {
          choices: [
            { id: "c1", label: "A" },
            { id: "c2", label: "B" },
          ],
        },
      }),
    ];
    const result = validateAnswersAgainstQuestions(FORM_ID, questions, [
      { questionId: "q1", value: "c9" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("accepts file uploads scoped to the current form question", () => {
    const questions = [
      question({ id: "file-q", type: "file_upload", required: true }),
    ];
    const result = validateAnswersAgainstQuestions(FORM_ID, questions, [
      { questionId: "file-q", value: fileAnswer("file-q", FORM_ID) },
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects file uploads from another form", () => {
    const questions = [
      question({ id: "file-q", type: "file_upload", required: true }),
    ];
    const result = validateAnswersAgainstQuestions(FORM_ID, questions, [
      {
        questionId: "file-q",
        value: fileAnswer("file-q", "other-form-id"),
      },
    ]);
    expect(result.ok).toBe(false);
  });
});
