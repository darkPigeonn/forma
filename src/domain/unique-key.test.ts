import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  normalizePhone,
  uniqueKeyFromAnswers,
} from "@/domain/unique-key";
import type { QuestionInput } from "@/lib/validators/question";

const SECTION_ID = "section-1";

function question(
  overrides: Partial<QuestionInput> & Pick<QuestionInput, "id" | "type">,
): QuestionInput {
  return {
    label: overrides.label ?? "Label",
    helpText: "",
    required: true,
    order: 0,
    sectionId: SECTION_ID,
    ...overrides,
  };
}

describe("normalizePhone", () => {
  it("normalizes Indonesian numbers to leading zero", () => {
    expect(normalizePhone("+628123456789")).toBe("08123456789");
    expect(normalizePhone("8123456789")).toBe("08123456789");
    expect(normalizePhone("08123456789")).toBe("08123456789");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims email", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("uniqueKeyFromAnswers", () => {
  it("returns null key for browser mode", () => {
    const result = uniqueKeyFromAnswers("browser", null, [], []);
    expect(result).toEqual({ ok: true, key: null });
  });

  it("builds email unique key from the email question", () => {
    const emailQ = question({
      id: "email-q",
      type: "email",
      label: "Email",
    });
    const result = uniqueKeyFromAnswers(
      "email",
      "email-q",
      [emailQ],
      [{ questionId: "email-q", value: "Ada@Mail.com" }],
    );
    expect(result).toEqual({ ok: true, key: "ada@mail.com" });
  });

  it("rejects missing unique email answer", () => {
    const emailQ = question({
      id: "email-q",
      type: "email",
      label: "Email",
    });
    const result = uniqueKeyFromAnswers("email", "email-q", [emailQ], []);
    expect(result.ok).toBe(false);
  });

  it("builds phone unique key from a phone-like question", () => {
    const phoneQ = question({
      id: "phone-q",
      type: "short_text",
      label: "Nomor HP",
    });
    const result = uniqueKeyFromAnswers(
      "phone",
      "phone-q",
      [phoneQ],
      [{ questionId: "phone-q", value: "08123456789" }],
    );
    expect(result).toEqual({ ok: true, key: "08123456789" });
  });
});
