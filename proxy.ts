import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuthorization } from "./lib/adminAuth";

export function proxy(request: NextRequest) {
  const result = checkAdminAuthorization(request.headers.get("authorization"), process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
  const response = result === "authorized"
    ? NextResponse.next()
    : new NextResponse(result === "unconfigured" ? "Admin access is not configured." : "Admin authentication required.", {
      status: result === "unconfigured" ? 503 : 401,
      headers: result === "unauthorized" ? { "WWW-Authenticate": 'Basic realm="Kannada Buddy admin", charset="UTF-8"' } : {}
    });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Vary", "Authorization");
  return response;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
