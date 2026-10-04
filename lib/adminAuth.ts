import { createHash, timingSafeEqual } from "node:crypto";

export type AdminAuthResult = "authorized" | "unauthorized" | "unconfigured";

function equalSecret(actual: string, expected: string): boolean {
  return timingSafeEqual(createHash("sha256").update(actual).digest(), createHash("sha256").update(expected).digest());
}

/** Server-side only: credentials must never use NEXT_PUBLIC environment variables. */
export function checkAdminAuthorization(header: string | null, username: string | undefined, password: string | undefined): AdminAuthResult {
  if (!username || !password || username.includes(":")) return "unconfigured";
  if (!header || header.length > 8192) return "unauthorized";
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(header);
  if (!match) return "unauthorized";
  const encoded = match[1];
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) return "unauthorized";
  const credentials = bytes.toString("utf8");
  if (!Buffer.from(credentials, "utf8").equals(bytes)) return "unauthorized";
  const separator = credentials.indexOf(":");
  if (separator < 0) return "unauthorized";
  const usernameMatches = equalSecret(credentials.slice(0, separator), username);
  const passwordMatches = equalSecret(credentials.slice(separator + 1), password);
  return usernameMatches && passwordMatches ? "authorized" : "unauthorized";
}
