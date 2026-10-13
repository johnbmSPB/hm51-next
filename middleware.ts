import { NextRequest, NextResponse } from "next/server";
import {
  consumeRateLimit,
  matchRateLimitPolicy,
} from "./app/lib/rateLimitPolicy";

const APP_STORE_URL =
  "https://apps.apple.com/ru/app/%D1%85%D0%BE%D0%BA%D0%BA%D0%B5%D0%B9%D0%BD%D1%8B%D0%B9-%D0%BC%D0%B5%D0%BD%D0%B5%D0%B4%D0%B6%D0%B5%D1%80-%D1%85%D0%BC-5-1/id6814732469";

const WEB_APP_HOSTS = new Set([
  "app.hm5-1.ru",
  "hm51-next.vercel.app",
]);

const WEB_APP_PATHS = [
  "/app-start",
  "/calendar",
  "/chat",
  "/coach",
  "/coach-training",
  "/connecting-team",
  "/equipment-repair",
  "/find-team",
  "/find-training",
  "/hockey-hour",
  "/home",
  "/login",
  "/marketplace",
  "/menu",
  "/profile-setup",
  "/register",
  "/role-select",
  "/settings",
  "/team-code",
  "/team",
];

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

function isWebAppPath(pathname: string) {
  if (pathname === "/") return true;

  return WEB_APP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const pathname = request.nextUrl.pathname;

  if (
    (request.method === "GET" || request.method === "HEAD") &&
    WEB_APP_HOSTS.has(hostname) &&
    isWebAppPath(pathname)
  ) {
    return NextResponse.redirect(new URL(APP_STORE_URL));
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
    "/app-start/:path*",
    "/calendar/:path*",
    "/chat/:path*",
    "/coach/:path*",
    "/coach-training/:path*",
    "/connecting-team/:path*",
    "/equipment-repair/:path*",
    "/find-team/:path*",
    "/find-training/:path*",
    "/hockey-hour/:path*",
    "/home/:path*",
    "/login/:path*",
    "/marketplace/:path*",
    "/menu/:path*",
    "/profile-setup/:path*",
    "/register/:path*",
    "/role-select/:path*",
    "/settings/:path*",
    "/team-code/:path*",
    "/team/:path*",
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
