import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Thesis Writer").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
});

test("login redirects to projects and lists seeded project", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/projects");
  await expect(page.getByText("Meus Projetos")).toBeVisible();
  await expect(page.getByText("Tese: IA no Ensino de Línguas")).toBeVisible();
});

test("editor opens with tabs and file tree", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/projects");
  await page.locator('a[href*="/editor"]').first().click();

  await page.waitForSelector(".cm-content");
  await expect(page.getByRole("tab", { name: "Visualizar" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Orientador Virtual" })).toBeVisible();
  await expect(page.locator(".cm-content")).toContainText("Introdução");
});

test("markdown live preview conceals syntax off the cursor line", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/projects");
  await page.locator('a[href*="/editor"]').first().click();
  await page.waitForSelector(".cm-content");

  await page.locator(".cm-line", { hasText: "inteligência artificial" }).first().click();
  const heading = page.locator(".cm-line", { hasText: "Introdução" }).first();
  await expect(heading.locator(".cm-lp-hidden")).toHaveCount(1);
});
