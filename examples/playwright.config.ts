import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/example.spec.ts",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3101",
    browserName: "chromium",
    serviceWorkers: "block",
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  },
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    // Isolated example credentials, never real admin access.
    env: { ADMIN_USERNAME: "example-reviewer", ADMIN_PASSWORD: "synthetic-example-password-only" }
  }
});
