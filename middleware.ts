import { NextRequest, NextResponse } from "next/server";
import {
  consumeRateLimit,
  matchRateLimitPolicy,
} from "./app/lib/rateLimitPolicy";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const firstForwarded = forwarded.split(",")[0]?.trim();

  return (
    firstForwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/" &&
    (hostname === "app.hm5-1.ru" || hostname === "hm51-next.vercel.app")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (request.method === "POST") {
    const policy = matchRateLimitPolicy(pathname);

    if (policy) {
      const now = Date.now();
      const ip = getClientIp(request);
      const result = consumeRateLimit(`${policy.id}:${ip}`, policy, now);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((result.resetAt - now) / 1000)
      );

      if (!result.allowed) {
        return NextResponse.json(
          {
            result: false,
            error: "Слишком много запросов. Повторите попытку позже.",
            retryAfter: retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSeconds),
              "X-RateLimit-Limit": String(result.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
              "Cache-Control": "no-store",
            },
          }
        );
      }

      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/api/login",
    "/api/register",
    "/api/send-email-code",
    "/api/restore-password",
    "/api/change-email",
    "/api/chat/team-send",
    "/api/join-team",
    "/api/coach/access",
    "/api/coach/profile-save",
    "/api/coach/delete-profile",
    "/api/webauthn/register/options",
    "/api/webauthn/register/verify",
    "/api/webauthn/authenticate/options",
    "/api/webauthn/authenticate/verify",
    "/api/webauthn/rebind",
    "/api/webauthn/disable",
  ],
};
