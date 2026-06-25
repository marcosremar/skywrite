import { expect, test, type Page } from "@playwright/test";

let scratchId = "";

async function openScratch(page: Page, name: string) {
  await page.goto("/projects/new");
  await page.getByLabel("Nome do Projeto").fill(name);
  await page.getByRole("button", { name: "Criar Projeto" }).click();
  await page.waitForSelector(".cm-content");
  scratchId = page.url().match(/projects\/([^/]+)\/editor/)?.[1] ?? "";
}

const RESEARCH = {
  answer: "A gamificação aumenta a motivação dos alunos no ensino de línguas [1].",
  searchQuery: "gamificação ensino motivação",
  sources: [{ title: "Gamification in Language Learning", url: "https://example.org/gam", snippet: "Estudo...", fullText: true }],
  verdicts: [{ claim: "gamificação aumenta motivação", classification: "supported", evidence: "trecho", source: 1 }],
};

async function mockResearch(page: Page) {
  await page.route("**/api/projects/*/research", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(RESEARCH) })
  );
}

async function askTutor(page: Page) {
  await page.getByRole("tab", { name: "Orientador Virtual" }).click();
  await page.getByRole("tab", { name: "Chat" }).click();
  const input = page.getByPlaceholder("Pergunte algo sobre sua tese...");
  await input.fill("A gamificação ajuda na motivação?");
  await input.press("Enter");
}

test.describe("tutor (mocked gateway)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await openScratch(page, `E2E mock ${testInfo.line} ${Date.now()}`);
  });
  test.afterEach(async ({ page }) => {
    if (scratchId) await page.request.delete(`/api/projects/${scratchId}`).catch(() => {});
  });

  test("chat renders the tutor answer and source", async ({ page }) => {
    await mockResearch(page);
    await askTutor(page);
    await expect(page.getByText("A gamificação aumenta a motivação dos alunos")).toBeVisible();
    await expect(page.getByText("Gamification in Language Learning")).toBeVisible();
  });

  test("+ Citar inserts the citation key into the document", async ({ page }) => {
    await mockResearch(page);
    await page.route("**/api/projects/*/citations/from-source", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ bibtex: "@article{gam2021,\n  title = {Gamification},\n  doi = {10.1/g}\n}", resolved: true }),
      })
    );
    await askTutor(page);
    await page.getByRole("button", { name: "+ Citar" }).first().click();
    await expect(page.getByText(/Citação inserida/)).toBeVisible();
    await expect(page.locator(".cm-content")).toContainText("@gam2021");
  });

  test("chat surfaces a clear error when the gateway is down", async ({ page }) => {
    await page.route("**/api/projects/*/research", (route) =>
      route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "gateway fora" }) })
    );
    await askTutor(page);
    await expect(page.getByText(/gateway fora|indisponível|erro/i)).toBeVisible({ timeout: 15_000 });
  });
});
