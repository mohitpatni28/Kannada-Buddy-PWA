// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkAdminAuthorization } from "../lib/adminAuth";
import { proxy } from "../proxy";

const basic = (value: string) => `Basic ${Buffer.from(value).toString("base64")}`;
afterEach(() => vi.unstubAllEnvs());

describe("admin authentication", () => {
  it("fails closed if either credential is absent or username is invalid", () => {
    expect(checkAdminAuthorization(basic("user:pass"), undefined, "pass")).toBe("unconfigured");
    expect(checkAdminAuthorization(basic("user:pass"), "user", "")).toBe("unconfigured");
    expect(checkAdminAuthorization(basic("user:pass"), "user:name", "pass")).toBe("unconfigured");
  });
  it("accepts exact credentials, Unicode and colons in the password", () => {
    expect(checkAdminAuthorization(basic("user:pāss:word"), "user", "pāss:word")).toBe("authorized");
    expect(checkAdminAuthorization(basic("user:pass"), "user", "pass")).toBe("authorized");
  });
  it.each([null, "Bearer token", "Basic !!!", "Basic A", basic("user"), basic("wrong:pass"), basic("user:wrong"), `Basic ${Buffer.from([255, 58, 97]).toString("base64")}`, "Basic " + "A".repeat(9000)])("rejects malformed or incorrect credentials: %s", (header) => {
    expect(checkAdminAuthorization(header, "user", "pass")).toBe("unauthorized");
  });
  it("guards real Next requests and sets private cache and challenge headers", () => {
    vi.stubEnv("ADMIN_USERNAME", "user");
    vi.stubEnv("ADMIN_PASSWORD", "pass");
    const rejected = proxy(new NextRequest("https://example.test/admin"));
    expect(rejected.status).toBe(401);
    expect(rejected.headers.get("www-authenticate")).toContain("Basic realm=");
    expect(rejected.headers.get("cache-control")).toContain("no-store");
    const accepted = proxy(new NextRequest("https://example.test/admin?view=all", { headers: { authorization: basic("user:pass"), RSC: "1" } }));
    expect(accepted.headers.get("x-middleware-next")).toBe("1");
    expect(accepted.headers.get("cache-control")).toContain("private");
    expect(accepted.headers.get("vary")).toBe("Authorization");
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(proxy(new NextRequest("https://example.test/admin")).status).toBe(503);
  });
});
