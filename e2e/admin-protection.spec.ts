import { expect, test } from "@playwright/test";

const credentials = { username: "test-reviewer", password: "local-e2e-password-only" };
const authorization = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`;

test("server protects admin documents, nested paths, and router payloads", async ({ request }) => {
  for (const path of ["/admin", "/admin?test=1", "/admin/private", "/api/admin/private"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain("Basic");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers().vary?.toLowerCase()).toContain("authorization");
  }
  for (const path of ["/%61dmin", "/%61%64%6d%69%6e", "/admin%2F", "/admin/", "/admin%5Cprivate", "/admin.rsc", "/admin.prefetch.rsc"]) {
    expect([401, 404]).toContain((await request.get(path)).status());
  }
  const router = await request.get("/admin?_rsc=regression", { headers: { RSC: "1" } });
  expect(router.status()).toBe(401);
  const invalid = await request.get("/admin", { headers: { Authorization: "Basic malformed" } });
  expect(invalid.status()).toBe(401);
  const valid = await request.get("/admin", { headers: { Authorization: authorization } });
  expect(valid.status()).toBe(200);
  expect(valid.headers()["cache-control"]).toContain("no-store");
  expect(valid.headers()["cache-control"]).toContain("private");
  // Next manages Vary for successful app-router responses; private/no-store prevents cache reuse.
  expect(valid.headers().vary?.toLowerCase()).toContain("rsc");
  expect((await request.get("/phrasebook")).status()).toBe(200);
});

test("authenticated admin cannot be revisited from offline caches", async ({ page, context }) => {
  await context.setHTTPCredentials(credentials);
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const cached = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });
  expect(cached.some((path) => path === "/admin" || path.startsWith("/admin/"))).toBe(false);
  await context.setOffline(true);
  await expect(page.goto("/admin")).rejects.toThrow("ERR_INTERNET_DISCONNECTED");
  await expect(page.getByRole("button", { name: /^priority queue/ })).toHaveCount(0);
  await context.setOffline(false);
});

test("review queues triggers browser authentication through a full navigation with an active worker", async ({ page, context }) => {
  await page.goto("/library");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const client = await context.newCDPSession(page);
  const challenges: string[] = [];
  const navigationRequests: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest()) navigationRequests.push(new URL(request.url()).pathname);
  });
  await client.send("Fetch.enable", { handleAuthRequests: true });
  client.on("Fetch.requestPaused", (event) => { void client.send("Fetch.continueRequest", { requestId: event.requestId }); });
  client.on("Fetch.authRequired", (event) => {
    challenges.push(event.authChallenge.realm);
    void client.send("Fetch.continueWithAuth", {
      requestId: event.requestId,
      authChallengeResponse: { response: "ProvideCredentials", ...credentials }
    });
  });
  try {
    await page.getByRole("link", { name: "Review queues", exact: true }).click();
    await expect.poll(() => challenges, { timeout: 5000 }).toContain("Kannada Buddy admin");
    await expect(page.getByRole("heading", { name: "Review reference drafts", exact: true })).toBeVisible();
    expect(navigationRequests).toContain("/admin");
  } finally {
    await client.send("Fetch.disable");
    await client.detach();
  }
});
