import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * E2E del guion de demo. Levanta un servidor propio con una base PGlite separada (.data/e2e)
 * para no tocar la base de desarrollo. El test reinicia el escenario demo al empezar.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/entrar`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { PGLITE_DIR: ".data/e2e", EDUCAI_AI: "off", DEMO_MODE: "true" },
  },
});
