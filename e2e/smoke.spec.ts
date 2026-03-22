import { test, expect } from "@playwright/test";

test("rota /login mostra login ou redireciona (sem Supabase no CI)", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/(login|dashboard)/);
  if (page.url().includes("/login")) {
    await expect(
      page.getByRole("heading", { name: "InstaPulse" }),
    ).toBeVisible();
  }
});

test("raiz redireciona ou mostra app", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(login|dashboard)/);
});
