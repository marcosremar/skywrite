import { expect, test, type Page } from "@playwright/test";

const DEMO_PROJECT = "Tese: IA no Ensino de Línguas";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/projects");
}

async function openDemoProject(page: Page) {
  await page.getByText(DEMO_PROJECT).click();
  await page.waitForSelector(".cm-content");
}

async function createProject(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.getByLabel("Nome do Projeto").fill(name);
  await page.getByRole("button", { name: "Criar Projeto" }).click();
  await page.waitForSelector(".cm-content");
}

async function deleteProject(page: Page, name: string) {
  await page.goto("/projects");
  const card = page.locator(".group", { hasText: name }).first();
  await card.hover();
  await card.getByTitle("Excluir projeto").click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.getByText(name)).toHaveCount(0, { timeout: 5000 });
}

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Skywrite").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
});

test("login redirects to projects and lists seeded project", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Meus Projetos")).toBeVisible();
  await expect(page.getByText(DEMO_PROJECT)).toBeVisible();
});

test("editor opens with tabs and file tree", async ({ page }) => {
  await login(page);
  await openDemoProject(page);
  await expect(page.getByRole("tab", { name: "Visualizar" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Orientador Virtual" })).toBeVisible();
  await expect(page.locator(".cm-content")).toContainText("Introdução");
});

test("editing shows save status transitioning to saved", async ({ page }) => {
  await login(page);
  await createProject(page, "E2E Save Status");
  const firstLine = page.locator(".cm-line").first();
  await firstLine.click();
  await page.keyboard.press("End");
  await page.keyboard.type(" titulo editado");
  await expect(page.getByText(/^Salvo /)).toBeVisible({ timeout: 10000 });
  await deleteProject(page, "E2E Save Status");
});

test("delete a project from the list", async ({ page }) => {
  await login(page);
  await createProject(page, "E2E Delete Me");
  await deleteProject(page, "E2E Delete Me");
});

test("terms and privacy pages render", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Termos de Uso" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();
});

test("register and delete own account (LGPD)", async ({ page }) => {
  const email = `e2e-acct-${Date.now()}@skywrite.test`;
  await page.goto("/register");
  await page.getByLabel("Nome").fill("E2E Conta");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill("password123");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.waitForURL("**/projects");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Excluir minha conta" }).click();
  await page.getByRole("button", { name: "Excluir conta", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");
});

test("citation check against Crossref shows status badges", async ({ page }) => {
  await login(page);
  await openDemoProject(page);
  await page.getByRole("tab", { name: "Orientador Virtual" }).click();
  await page.getByRole("button", { name: "Verificar referências" }).click();
  await expect(page.getByText(/encontrada|não encontrada|divergente/).first()).toBeVisible({ timeout: 90000 });
});

test("markdown live preview conceals syntax off the cursor line", async ({ page }) => {
  await login(page);
  await openDemoProject(page);
  await page.locator(".cm-line", { hasText: "inteligência artificial" }).first().click();
  const heading = page.locator(".cm-line", { hasText: "Introdução" }).first();
  await expect(heading.locator(".cm-lp-hidden")).toHaveCount(1);
});

test("clicking a rendered citation opens the citation editor modal", async ({ page }) => {
  await login(page);
  await openDemoProject(page);
  await page.getByText("02-referencial.md").click();
  await page.waitForSelector(".cm-citation-item", { timeout: 15000 });
  await page.locator(".cm-citation-item").first().click();
  await expect(page.getByPlaceholder("Buscar referência...")).toBeVisible({ timeout: 5000 });
});
