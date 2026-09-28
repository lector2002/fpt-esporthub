import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL points the suite at an already running stack (e.g. the production images on :8080);
// without it the local dev servers are used, started from the root .env if not already running.
const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    // No daily check-in popup (or reward credits) unless a spec opts in: see e2e/rewards.spec.ts.
    storageState: { cookies: [], origins: [{ origin: baseURL, localStorage: [{ name: "fpt-esporthub-skip-check-in", value: "1" }] }] },
    trace: "on-first-retry",
  },
  webServer: externalBaseUrl
    ? undefined
    : [
        { command: "npm run dev:api", url: "http://localhost:4000/api/v1/health", reuseExistingServer: true, timeout: 120_000 },
        {
          command: "npm run dev:web",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120_000,
          env: { NEXT_PUBLIC_API_URL: "http://localhost:4000" },
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
