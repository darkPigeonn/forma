import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIXTURE_FORM_ID,
  FIXTURE_NAME_QUESTION_ID,
  FIXTURE_SLUG,
  buildPublishedForm,
} from "@/test/fixtures/public-form";
import { ui } from "@/lib/ui-id";

vi.mock("@/db/queries/public-forms", () => ({
  getPublicFormBySlug: vi.fn(),
}));

vi.mock("@/db/queries/responses", () => ({
  createFormResponse: vi.fn(),
  hasResponseForRespondent: vi.fn(),
  hasResponseForUniqueKey: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    rateLimitAll: vi.fn().mockResolvedValue({ ok: true }),
  };
});

import { getPublicFormBySlug } from "@/db/queries/public-forms";
import {
  createFormResponse,
  hasResponseForRespondent,
  hasResponseForUniqueKey,
} from "@/db/queries/responses";
import { POST } from "./route";

const routeContext = {
  params: Promise.resolve({ slug: FIXTURE_SLUG }),
};

function submitRequest(
  body: unknown,
  init?: { headers?: Record<string, string> },
) {
  return new NextRequest(`http://localhost/api/f/${FIXTURE_SLUG}/submit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/f/[slug]/submit", () => {
  beforeEach(() => {
    vi.mocked(getPublicFormBySlug).mockReset();
    vi.mocked(createFormResponse).mockReset();
    vi.mocked(hasResponseForRespondent).mockReset();
    vi.mocked(hasResponseForUniqueKey).mockReset();

    vi.mocked(getPublicFormBySlug).mockResolvedValue(buildPublishedForm());
    vi.mocked(hasResponseForRespondent).mockResolvedValue(false);
    vi.mocked(hasResponseForUniqueKey).mockResolvedValue(false);
    vi.mocked(createFormResponse).mockResolvedValue({
      id: "resp123456789abc",
      submittedAt: "2026-08-31T07:00:00.000Z",
    });
  });

  it("returns 404 when the form slug is unknown", async () => {
    vi.mocked(getPublicFormBySlug).mockResolvedValue(null);

    const response = await POST(
      submitRequest({
        answers: [{ questionId: FIXTURE_NAME_QUESTION_ID, value: "Noel" }],
      }),
      routeContext,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: ui.formNotFound,
    });
  });

  it("returns 403 when the form is closed", async () => {
    vi.mocked(getPublicFormBySlug).mockResolvedValue(
      buildPublishedForm({ status: "closed" }),
    );

    const response = await POST(
      submitRequest({
        answers: [{ questionId: FIXTURE_NAME_QUESTION_ID, value: "Noel" }],
      }),
      routeContext,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: ui.formClosedBody,
    });
  });

  it("returns 400 when required answers are missing", async () => {
    const response = await POST(submitRequest({ answers: [] }), routeContext);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.errors?.[0]?.questionId).toBe(FIXTURE_NAME_QUESTION_ID);
  });

  it("returns 409 when a unique email was already used and limit is enabled", async () => {
    vi.mocked(getPublicFormBySlug).mockResolvedValue(
      buildPublishedForm({
        limitOneResponse: true,
        uniqueBy: "email",
        uniqueQuestionId: "q-email",
        questions: [
          {
            id: "q-email",
            type: "email",
            label: "Email",
            helpText: "",
            required: true,
            order: 0,
            sectionId: "section-1",
          },
        ],
      }),
    );
    vi.mocked(hasResponseForUniqueKey).mockResolvedValue(true);

    const response = await POST(
      submitRequest({
        answers: [{ questionId: "q-email", value: "user@example.com" }],
      }),
      routeContext,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: ui.uniqueAlreadyUsed,
    });
  });

  it("allows duplicate unique email when one-response limit is disabled", async () => {
    vi.mocked(getPublicFormBySlug).mockResolvedValue(
      buildPublishedForm({
        limitOneResponse: false,
        uniqueBy: "email",
        uniqueQuestionId: "q-email",
        questions: [
          {
            id: "q-email",
            type: "email",
            label: "Email",
            helpText: "",
            required: true,
            order: 0,
            sectionId: "section-1",
          },
        ],
      }),
    );
    vi.mocked(hasResponseForUniqueKey).mockResolvedValue(true);

    const response = await POST(
      submitRequest({
        answers: [{ questionId: "q-email", value: "user@example.com" }],
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(hasResponseForUniqueKey).not.toHaveBeenCalled();
  });

  it("creates a response and returns confirmation metadata", async () => {
    const response = await POST(
      submitRequest({
        answers: [{ questionId: FIXTURE_NAME_QUESTION_ID, value: "Noel" }],
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      confirmationMessage: ui.defaultConfirmation,
      receiptId: "56789ABC",
      submittedAt: "2026-08-31T07:00:00.000Z",
    });

    expect(createFormResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: FIXTURE_FORM_ID,
        answers: [{ questionId: FIXTURE_NAME_QUESTION_ID, value: "Noel" }],
        respondentKey: expect.stringMatching(/^open:\d+:[a-f0-9]+$/),
        uniqueKey: expect.stringMatching(/^uniq:\d+:[a-f0-9]+$/),
      }),
    );
  });

  it("sets respondent cookie when one-response-per-browser is enabled", async () => {
    vi.mocked(getPublicFormBySlug).mockResolvedValue(
      buildPublishedForm({ limitOneResponse: true }),
    );

    const response = await POST(
      submitRequest({
        answers: [{ questionId: FIXTURE_NAME_QUESTION_ID, value: "Noel" }],
      }),
      routeContext,
    );

    expect(response.status).toBe(200);
    const cookie = response.cookies.get(`forma_once_${FIXTURE_FORM_ID}`);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });
});
