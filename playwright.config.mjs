import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

/**
 * End-to-end tests against the dev server and the local database (npm run db:local).
 * Emails are read from the .dev-mail outbox, so no real inbox is needed.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A dedicated server on 3100, always started fresh by the test run, with relaxed rate limits
  // (the suite signs in many times from one IP). The normal dev server on 3000 keeps real limits.
  webServer: {
    command: "npx next dev --turbopack -p 3100",
    url: "http://localhost:3100/admin/login",
    reuseExistingServer: false,
    timeout: 180_000,
    // The dev server compiles every route the suite visits; give it room (it ran out of the default heap).
    env: { E2E_RELAXED_LIMITS: "1", NEXT_PUBLIC_SITE_URL: "http://localhost:3100", NODE_OPTIONS: "--max-old-space-size=6144" },
  },
});
