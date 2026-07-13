import { NextRequest, NextResponse } from "next/server";

const ARENA_DEMO_LOGIN = "johnbm0";
const ARENA_DEMO_PASSWORD = "12345";
const ARENA_DEMO_TOKEN = "arena-demo-local-token";
const ARENA_DEMO_COOKIE = "hm51_arena_demo_session";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url, 307);
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  const isWebAppHost =
    hostname === "app.hm5-1.ru" ||
    hostname === "hm51-next.vercel.app";

  if (pathname === "/api/login" && request.method === "POST") {
    try {
      const body = await request.clone().json();
      const login = String(body?.login || body?.username || "").trim().toLowerCase();
      const password = String(body?.password || "");

      if (login === ARENA_DEMO_LOGIN) {
        if (password !== ARENA_DEMO_PASSWORD) {
          return NextResponse.json(
            {
              result: false,
              error: "Неверный пароль",
            },
            { status: 401 },
          );
        }

        const response = NextResponse.json({
          result: true,
          token: ARENA_DEMO_TOKEN,
          new_token: ARENA_DEMO_TOKEN,
          data: {
            token: ARENA_DEMO_TOKEN,
          },
          GAMER_TEAMS: [],
        });

        response.cookies.set({
          name: ARENA_DEMO_COOKIE,
          value: "1",
          httpOnly: true,
          sameSite: "lax",
          secure: request.nextUrl.protocol === "https:",
          path: "/",
          maxAge: 60 * 60 * 12,
        });

        return response;
      }
    } catch {
      // Обычный запрос авторизации передаётся существующему API без изменений.
    }

    return NextResponse.next();
  }

  const hasArenaDemoSession =
    request.cookies.get(ARENA_DEMO_COOKIE)?.value === "1";

  if (
    pathname.startsWith("/arena-demo") &&
    pathname !== "/arena-demo/logout" &&
    !hasArenaDemoSession
  ) {
    return redirectTo(request, "/login");
  }

  if (
    hasArenaDemoSession &&
    (pathname === "/login" || pathname === "/calendar")
  ) {
    return redirectTo(request, "/arena-demo");
  }

  if (isWebAppHost && pathname === "/") {
    return redirectTo(request, "/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/calendar",
    "/arena-demo/:path*",
    "/api/login",
  ],
};
