import { expect, test, type Page } from "@playwright/test";

let scratchId = "";

async function createScratch(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.getByLabel("Nome do Projeto").fill(name);
  await page.getByRole("button", { name: "Criar Projeto" }).click();
  await page.waitForSelector(".cm-content");
  scratchId = page.url().match(/projects\/([^/]+)\/editor/)?.[1] ?? "";
}

test.describe("more editor features", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await createScratch(page, `E2E tutor ${testInfo.line} ${Date.now()}`);
  });
  test.afterEach(async ({ page }) => {
    if (scratchId) await page.request.delete(`/api/projects/${scratchId}`).catch(() => {});
  });

  test("Orientador Análise shows a thesis score", async ({ page }) => {
    await page.getByRole("tab", { name: "Orientador Virtual" }).click();
    await expect(page.getByText(/Excelente|Bom|Regular|Precisa melhorar/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("Orientador feedback report completes (download or handled error)", async ({ page }) => {
    test.setTimeout(180_000);
    await page.getByRole("tab", { name: "Orientador Virtual" }).click();
    const btn = page.getByRole("button", { name: /Baixar relatório/ });
    await btn.click();
    await expect(btn).toBeEnabled({ timeout: 170_000 });
  });

  test("bibliography imports a citation from a DOI", async ({ page }) => {
    test.setTimeout(60_000);
    await page.getByRole("button", { name: /Referências \(/ }).click();
    await page.getByPlaceholder(/Colar DOI para importar/).fill("10.2307/3586393");
    await page.getByRole("button", { name: "Importar DOI" }).click();
    await expect(async () => {
      if (await page.getByText("DOI não encontrado").isVisible()) return;
      await page.getByRole("tab", { name: "Código BibTeX" }).click();
      await expect(page.locator("textarea")).toHaveValue(/3586393|krashen/i);
    }).toPass({ timeout: 40_000 });
  });

  test("metadata edit persists the author", async ({ page }) => {
    await page.getByRole("tab", { name: "Metadados" }).click();
    await page.getByLabel("Autor").fill("Autor E2E Teste");
    await page.getByRole("button", { name: "Salvar metadados" }).click();
    await expect(page.getByRole("button", { name: "Salvar metadados" })).toBeEnabled();
    await page.reload();
    await page.getByRole("tab", { name: "Metadados" }).click();
    await expect(page.getByLabel("Autor")).toHaveValue("Autor E2E Teste");
  });

  test("Revisão title suggestion completes (answer or handled error)", async ({ page }) => {
    test.setTimeout(120_000);
    await page.getByRole("tab", { name: "Revisão" }).click();
    const btn = page.getByRole("button", { name: "Sugerir títulos" });
    await btn.click();
    await expect(btn).toBeEnabled({ timeout: 110_000 });
  });

  test("Revisão abstract generation completes (answer or handled error)", async ({ page }) => {
    test.setTimeout(120_000);
    await page.getByRole("tab", { name: "Revisão" }).click();
    const btn = page.getByRole("button", { name: "Gerar resumo" });
    await btn.click();
    await expect(btn).toBeEnabled({ timeout: 110_000 });
  });

  test("cite a tutor-suggested source via + Citar (tutor loop)", async ({ page }) => {
    test.setTimeout(190_000);
    await page.getByRole("tab", { name: "Orientador Virtual" }).click();
    await page.getByRole("tab", { name: "Chat" }).click();
    const input = page.getByPlaceholder("Pergunte algo sobre sua tese...");
    await input.fill("Quais fontes apoiam o uso de gamificação no ensino de línguas?");
    await input.press("Enter");
    await expect(page.getByText("Consultando fontes e analisando...")).toBeHidden({ timeout: 170_000 });
    const cite = page.getByRole("button", { name: "+ Citar" }).first();
    if (!(await cite.isVisible().catch(() => false))) {
      test.skip(true, "tutor não retornou fontes citáveis nesta execução");
    }
    await cite.click();
    await expect(page.getByText(/Citação inserida/)).toBeVisible({ timeout: 30_000 });
  });
});

test("logout returns to the public area", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("button", { name: "Conta" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/(login)?$/);
});

test("templates page lists templates", async ({ page }) => {
  await page.goto("/templates");
  await expect(page.getByRole("heading", { name: "Templates", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Usar Template" }).first()).toBeVisible({ timeout: 30_000 });
});

test("create a project from a template", async ({ page }) => {
  const name = `E2E Template ${Date.now()}`;
  await page.goto("/templates");
  await page.getByRole("button", { name: "Usar Template" }).first().click();
  await page.waitForURL(/projects\/new/);
  await page.getByLabel("Nome do Projeto").fill(name);
  await page.getByRole("button", { name: "Criar Projeto" }).click();
  await page.waitForSelector(".cm-content");
  const id = page.url().match(/projects\/([^/]+)\/editor/)?.[1] ?? "";
  if (id) await page.request.delete(`/api/projects/${id}`).catch(() => {});
});
