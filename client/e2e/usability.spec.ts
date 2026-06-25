import { test, type Page } from "@playwright/test";

const DEMO = "Tese: IA no Ensino de Línguas";
const shot = (page: Page, name: string) => page.screenshot({ path: `usability/${name}.png` });

const RESEARCH = {
  answer: "A gamificação aumenta a motivação dos alunos no ensino de línguas [1].",
  searchQuery: "gamificação ensino",
  sources: [{ title: "Gamification in Language Learning", url: "https://example.org/g", snippet: "Estudo...", fullText: true }],
  verdicts: [{ claim: "gamificação aumenta motivação", classification: "supported", evidence: "trecho", source: 1 }],
};

test("capture every screen for usability review", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.route("**/api/projects/*/research", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(RESEARCH) })
  );

  await page.goto("/projects");
  await page.getByText(DEMO).waitFor({ timeout: 15_000 });
  await shot(page, "02-projects");

  await page.goto("/templates");
  await page.getByRole("button", { name: "Usar Template" }).first().waitFor({ timeout: 15_000 });
  await shot(page, "08-templates");

  await page.goto("/projects/new");
  await page.getByLabel("Nome do Projeto").waitFor();
  await shot(page, "09-new-project");

  await page.goto("/settings");
  await page.getByText("Configurações").waitFor();
  await shot(page, "10-settings");

  await page.goto("/projects");
  await page.getByText(DEMO).click();
  await page.waitForSelector(".cm-content");
  await shot(page, "03-editor");

  await page.getByRole("tab", { name: "Metadados" }).click();
  await page.getByLabel("Autor").waitFor();
  await shot(page, "11-metadados");

  await page.getByRole("tab", { name: "Editar" }).click();
  await page.getByRole("tab", { name: "Orientador Virtual" }).click();
  await page.getByText(/Excelente|Bom|Regular|Precisa melhorar/).first().waitFor({ timeout: 15_000 });
  await shot(page, "04-orientador-analise");

  await page.getByRole("tab", { name: "Chat" }).click();
  const input = page.getByPlaceholder("Pergunte algo sobre sua tese...");
  await input.fill("A gamificação ajuda na motivação?");
  await input.press("Enter");
  await page.getByText("Gamification in Language Learning").waitFor({ timeout: 15_000 });
  await shot(page, "05-tutor-chat");

  await page.getByRole("tab", { name: "Revisão" }).click();
  await page.getByRole("button", { name: "Analisar" }).click();
  await page.getByText("Métricas de escrita").waitFor({ timeout: 30_000 }).catch(() => {});
  await shot(page, "06-revisao");

  await page.getByRole("button", { name: /Referências \(/ }).click();
  await page.getByText("Gerenciar Referências Bibliográficas").waitFor({ timeout: 5_000 }).catch(() => {});
  await shot(page, "07-bibliografia");

  await context.clearCookies();
  await page.goto("/");
  await shot(page, "01-landing");
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).waitFor();
  await shot(page, "12-login");
  await page.goto("/register");
  await page.getByRole("button", { name: "Criar conta" }).waitFor();
  await shot(page, "13-register");
  await page.goto("/terms");
  await page.getByRole("heading", { name: "Termos de Uso" }).waitFor();
  await shot(page, "14-terms");
  await page.goto("/privacy");
  await page.getByRole("heading", { name: "Política de Privacidade" }).waitFor();
  await shot(page, "15-privacy");
});
