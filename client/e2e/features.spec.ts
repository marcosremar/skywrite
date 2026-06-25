import { expect, test, type Page } from "@playwright/test";

let scratchId = "";

async function createScratch(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.getByLabel("Nome do Projeto").fill(name);
  await page.getByRole("button", { name: "Criar Projeto" }).click();
  await page.waitForSelector(".cm-content");
  scratchId = page.url().match(/projects\/([^/]+)\/editor/)?.[1] ?? "";
}

test.describe("editor features", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await createScratch(page, `E2E feat ${testInfo.line} ${Date.now()}`);
  });
  test.afterEach(async ({ page }) => {
    if (scratchId) {
      await page.request.delete(`/api/projects/${scratchId}`).catch(() => {});
      scratchId = "";
    }
  });

  test("Ctrl/Cmd+S saves the document", async ({ page }) => {
    const line = page.locator(".cm-line").first();
    await line.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" edição via atalho");
    await page.keyboard.press("ControlOrMeta+s");
    await expect(page.getByText(/^Salvo /)).toBeVisible({ timeout: 10000 });
  });

  test("toolbar inserts bold markup at the cursor", async ({ page }) => {
    await page.locator(".cm-line").first().click();
    await page.keyboard.press("End");
    await page.getByTitle(/Negrito/i).click();
    await expect(page.locator(".cm-content")).toContainText("**");
  });

  test("live preview styles a markdown link off the cursor line", async ({ page }) => {
    await page.locator(".cm-line").first().click();
    await page.keyboard.press("End");
    await page.keyboard.type("\nveja [Google](https://example.com) aqui");
    await page.locator(".cm-line").first().click();
    await expect(page.locator(".cm-lp-link", { hasText: "Google" })).toBeVisible();
  });

  test("an image renders as a widget without breaking the live preview", async ({ page }) => {
    await page.locator(".cm-line").first().click();
    await page.keyboard.press("End");
    await page.keyboard.type("\n![diagrama](media/x.png)");
    await page.locator(".cm-line").first().click();
    await expect(page.locator(".cm-image-widget")).toBeVisible();
  });

  test("toolbar undo reverts an edit", async ({ page }) => {
    await page.locator(".cm-line").first().click();
    await page.keyboard.press("End");
    await page.keyboard.type(" XYZ123");
    await expect(page.locator(".cm-content")).toContainText("XYZ123");
    await page.getByTitle(/Desfazer/).click();
    await expect(page.locator(".cm-content")).not.toContainText("XYZ123");
  });

  test("Revisão tab runs analysis and renders sections", async ({ page }) => {
    await page.getByRole("tab", { name: "Revisão" }).click();
    await page.getByRole("button", { name: "Analisar" }).click();
    await expect(page.getByText("Citações", { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Métricas de escrita")).toBeVisible();
    await expect(page.getByText("Prontidão para submissão")).toBeVisible();
    await expect(page.getByText("Originalidade")).toBeVisible();
  });

  test("Orientador chat accepts a question and starts answering (tutor interaction)", async ({ page }) => {
    await page.getByRole("tab", { name: "Orientador Virtual" }).click();
    await page.getByRole("tab", { name: "Chat" }).click();
    const question = "Qual a importância de uma metodologia clara na tese?";
    const input = page.getByPlaceholder("Pergunte algo sobre sua tese...");
    await input.fill(question);
    await input.press("Enter");
    await expect(page.getByText(question)).toBeVisible();
    await expect(page.getByText("Consultando fontes e analisando...")).toBeVisible({ timeout: 15000 });
  });

  test("Orientador chat completes the round-trip (answer or handled error)", async ({ page }) => {
    test.setTimeout(180_000);
    await page.getByRole("tab", { name: "Orientador Virtual" }).click();
    await page.getByRole("tab", { name: "Chat" }).click();
    const input = page.getByPlaceholder("Pergunte algo sobre sua tese...");
    await input.fill("Cite uma vantagem da gamificação no ensino.");
    await input.press("Enter");
    await expect(page.getByText("Consultando fontes e analisando...")).toBeHidden({ timeout: 170_000 });
    await expect(input).toBeEnabled();
  });

  test("bibliography adds a new citation via Nova Referencia", async ({ page }) => {
    await page.getByRole("button", { name: /Referências \(/ }).click();
    await page.getByRole("button", { name: "Nova Referência" }).click();
    await expect(page.getByText("Sem título").first()).toBeVisible();
  });

  test("bibliography imports a RIS record", async ({ page }) => {
    await page.getByRole("button", { name: /Referências \(/ }).click();
    await page.getByRole("button", { name: /Importar de arquivo RIS/ }).click();
    await page
      .getByPlaceholder("Cole o conteúdo .ris aqui")
      .fill("TY  - JOUR\nAU  - Teste, Autor\nTI  - Artigo Importado Via RIS\nPY  - 2022\nER  -");
    await page.getByRole("button", { name: "Importar RIS", exact: true }).click();
    await page.getByRole("tab", { name: "Código BibTeX" }).click();
    await expect(page.locator("textarea")).toHaveValue(/Artigo Importado Via RIS/);
  });

  test("build generates a PDF preview or a clear error", async ({ page }) => {
    test.setTimeout(200_000);
    await page.getByRole("button", { name: /Gerar PDF/ }).first().click();
    const preview = page.locator('iframe[title="PDF Preview"]');
    await expect(preview.or(page.getByText("Erro ao gerar PDF"))).toBeVisible({ timeout: 190_000 });
    if (await preview.isVisible()) {
      const link = page.getByRole("link", { name: "Baixar PDF" });
      await expect(link).toBeVisible();
      const href = await link.getAttribute("href");
      expect(href).toMatch(/\/pdf\?[^?]*download=1/);
      expect(href!.match(/\?/g)?.length).toBe(1);
    }
  });
});

test("data export button downloads a JSON file (LGPD)", async ({ page }) => {
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar meus dados" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("export");
});

test("expired session redirects to login", async ({ page, context }) => {
  await page.goto("/projects");
  await page.getByText("Meus Projetos").waitFor();
  await context.clearCookies();
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
});
