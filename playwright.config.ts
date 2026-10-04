import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    viewport: { width: 390, height: 844 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    }
  },
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { ADMIN_USERNAME: "test-reviewer", ADMIN_PASSWORD: "local-e2e-password-only" }
  }
});
