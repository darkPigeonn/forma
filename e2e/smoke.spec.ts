import { test, expect } from "@playwright/test";

test.describe("public pages", () => {
  test("landing page renders primary call to action", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: /Mulai|Ke dasbor/i }),
    ).toBeVisible();
  });

  test("login page renders email sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Kata sandi")).toBeVisible();
  });

  test("unknown public slug shows not found", async ({ page }) => {
    const slug = `missing-form-${Date.now()}`;
    await page.goto(`/f/${slug}`);
    await expect(
      page.getByRole("link", { name: "Kembali ke Survei" }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
