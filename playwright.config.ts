import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev:api",
      url: "http://localhost:4000/api/v1/health",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/fpt_esporthub?schema=public",
        JWT_SECRET: "local-dev-secret-change-before-production",
        PORT: "4000",
      },
    },
    {
      command: "npm run dev:web",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:4000",
      },
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
