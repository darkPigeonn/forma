import type { PublicFormView } from "@/db/queries/public-forms";
import { DEFAULT_FORM_THEME_ID } from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";
import type { QuestionInput, SectionInput } from "@/lib/validators/question";

export const FIXTURE_FORM_ID = "507f1f77bcf86cd799439011";
export const FIXTURE_SLUG = "test-slug";
export const FIXTURE_SECTION_ID = "section-1";
export const FIXTURE_NAME_QUESTION_ID = "q-name";

export const fixtureSection: SectionInput = {
  id: FIXTURE_SECTION_ID,
  title: "",
  description: "",
  order: 0,
};

export const fixtureNameQuestion: QuestionInput = {
  id: FIXTURE_NAME_QUESTION_ID,
  type: "short_text",
  label: "Nama",
  helpText: "",
  required: true,
  order: 0,
  sectionId: FIXTURE_SECTION_ID,
};

export const fixtureEmailQuestion: QuestionInput = {
  id: "q-email",
  type: "email",
  label: "Email",
  helpText: "",
  required: true,
  order: 1,
  sectionId: FIXTURE_SECTION_ID,
};

export function buildPublishedForm(
  overrides: Partial<PublicFormView> = {},
): PublicFormView {
  return {
    id: FIXTURE_FORM_ID,
    title: "Form Uji",
    description: "",
    status: "published",
    confirmationMessage: ui.defaultConfirmation,
    themeId: DEFAULT_FORM_THEME_ID,
    limitOneResponse: false,
    uniqueBy: "browser",
    uniqueQuestionId: null,
    headerImage: null,
    slug: FIXTURE_SLUG,
    questions: [fixtureNameQuestion],
    sections: [fixtureSection],
    ...overrides,
  };
}
