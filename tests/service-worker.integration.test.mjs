// @vitest-environment node
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let directory;
let source;
beforeAll(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "kannada-worker-"));
  await fs.mkdir(path.join(directory, "public"));
  await fs.mkdir(path.join(directory, ".next/static"), { recursive: true });
  await fs.writeFile(path.join(directory, "public/manifest.webmanifest"), "{}");
  await fs.mkdir(path.join(directory, ".next/static/test-build"));
  for (const filename of ["_buildManifest.js", "_clientMiddlewareManifest.js", "_ssgManifest.js", "app-chunk.js"]) {
    await fs.writeFile(path.join(directory, ".next/static/test-build", filename), "/* fixture */");
  }
  execFileSync(process.execPath, [path.resolve("scripts/generate-service-worker.mjs")], { cwd: directory });
  source = await fs.readFile(path.join(directory, "public/sw.js"), "utf8");
});
afterAll(async () => { if (directory) await fs.rm(directory, { recursive: true, force: true }); });

function worker(fetchImplementation = async () => new Response("network")) {
  const listeners = {};
  const cachedRequests = [new Request("https://example.test/admin?view=all"), new Request("https://example.test/api/admin/reviews"), new Request("https://example.test/today")];
  const cache = { addAll: vi.fn(async () => {}), put: vi.fn(async () => {}), keys: vi.fn(async () => cachedRequests), delete: vi.fn(async () => true) };
  const caches = { open: vi.fn(async () => cache), keys: vi.fn(async () => ["kannada-buddy-old", "unrelated"]), delete: vi.fn(async () => true), match: vi.fn(async () => new Response("cached public")) };
  const self = { location: { origin: "https://example.test" }, addEventListener: (name, callback) => { listeners[name] = callback; }, skipWaiting: vi.fn(async () => {}), clients: { claim: vi.fn(async () => {}) } };
  vm.runInNewContext(source, { self, caches, fetch: fetchImplementation, URL, Response });
  return { listeners, caches, cache, self };
}
async function request(workerInstance, url, options = {}) {
  let promise;
  workerInstance.listeners.fetch({ request: new Request(url, options), respondWith: (value) => { promise = value; } });
  return promise;
}

describe("generated service worker authentication boundaries", () => {
  it("does not precache admin and still precaches public pages", async () => {
    const instance = worker();
    let promise;
    instance.listeners.install({ waitUntil: (value) => { promise = value; } });
    await promise;
    const urls = instance.cache.addAll.mock.calls[0][0];
    expect(urls).toContain("/today");
    expect(urls).not.toContain("/admin");
  });
  it("excludes Pages Router manifests absent on Vercel while retaining application chunks", async () => {
    const instance = worker();
    let promise;
    instance.listeners.install({ waitUntil: (value) => { promise = value; } });
    await promise;
    const urls = instance.cache.addAll.mock.calls[0][0];
    expect(urls).toContain("/_next/static/test-build/app-chunk.js");
    for (const filename of ["_buildManifest.js", "_clientMiddlewareManifest.js", "_ssgManifest.js"]) {
      expect(urls).not.toContain(`/_next/static/test-build/${filename}`);
    }
  });
  it("purges previous app caches and protected entries before claiming clients", async () => {
    const instance = worker();
    let promise;
    instance.listeners.activate({ waitUntil: (value) => { promise = value; } });
    await promise;
    expect(instance.caches.delete).toHaveBeenCalledWith("kannada-buddy-old");
    expect(instance.caches.delete).not.toHaveBeenCalledWith("unrelated");
    expect(instance.cache.delete.mock.calls.map(([request]) => new URL(request.url).pathname)).toEqual(["/admin", "/api/admin/reviews"]);
    expect(instance.self.clients.claim).toHaveBeenCalledOnce();
  });
  it.each(["/admin", "/admin/review?x=1", "/api/admin/reviews", "/%61dmin"]) ("leaves protected navigation to the browser so HTTP auth can prompt: %s", async (pathname) => {
    const fetch = vi.fn(async () => new Response("authentication required", { status: 401 }));
    const instance = worker(fetch);
    const respondWith = vi.fn();
    instance.listeners.fetch({ request: new Request(`https://example.test${pathname}`), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(instance.caches.match).not.toHaveBeenCalled();
    expect(instance.cache.put).not.toHaveBeenCalled();
  });
  it("does not intercept authenticated requests or cache private server responses", async () => {
    const fetch = vi.fn(async () => new Response("secret", { headers: { "Cache-Control": "private, no-store" } }));
    const instance = worker(fetch);
    expect(await (await request(instance, "https://example.test/resource")).text()).toBe("secret");
    fetch.mockClear();
    const respondWith = vi.fn();
    instance.listeners.fetch({ request: new Request("https://example.test/library", { headers: { Authorization: "Basic test" } }), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(instance.cache.put).not.toHaveBeenCalled();
    expect(instance.caches.match).not.toHaveBeenCalled();
  });
  it("retains public caching and offline fallback", async () => {
    const online = worker();
    await request(online, "https://example.test/resource");
    expect(online.cache.put).toHaveBeenCalledOnce();
    const offline = worker(async () => { throw new Error("offline"); });
    expect(await (await request(offline, "https://example.test/resource")).text()).toBe("cached public");
    expect(offline.caches.match).toHaveBeenCalledOnce();
  });
});
