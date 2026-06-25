import { defineConfig } from "@playwright/test";

const STORAGE = "e2e/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5175",
    headless: true,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "authed",
      testMatch: /(features|tutor-features|tutor-mock|usability)\.spec\.ts/,
      use: { storageState: STORAGE },
      dependencies: ["setup"],
    },
    { name: "anon", testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "cd ../server && bunx tsx src/index.ts",
      url: "http://127.0.0.1:4000/api/health",
      reuseExistingServer: true,
      timeout: 90_000,
    },
    {
      command: "bun run dev",
      url: "http://localhost:5175",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
