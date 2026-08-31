import { test, expect } from "@playwright/test";
import { readE2EFixture } from "./fixture";

const fixture = readE2EFixture();

test.describe("public form submit", () => {
  test.skip(
    fixture.skip,
    fixture.reason ?? "E2E fixture unavailable (set MONGODB_URI)",
  );

  test("fills and submits a published form", async ({ page, context }) => {
    await context.clearCookies();

    await page.goto(`/f/${fixture.slug}`);
    await expect(page.getByRole("heading", { name: "Forma E2E" })).toBeVisible();

    const answer = `E2E ${Date.now()}`;
    const field = page.getByPlaceholder("Jawaban Anda");
    await field.fill(answer);
    await expect(field).toHaveValue(answer);

    await page.getByRole("button", { name: fixture.submitLabel ?? "Kirim" }).click();

    await expect(page.getByRole("status")).toContainText(
      fixture.successText ?? "Respons tercatat",
      { timeout: 15_000 },
    );
  });
});
