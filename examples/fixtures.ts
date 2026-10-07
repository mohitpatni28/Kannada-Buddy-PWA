import { test, expect } from "@playwright/test";

// Each example gets a fresh context; only its isolated production server is reachable.
test.beforeEach(async ({ context }) => {
  await context.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin === "http://127.0.0.1:3101") await route.continue();
    else await route.abort("blockedbyclient");
  });
});

export { test, expect };
