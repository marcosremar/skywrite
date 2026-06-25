import { test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/projects", { timeout: 60_000 });
  await page.context().storageState({ path: authFile });
});
