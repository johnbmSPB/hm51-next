import { NextRequest, NextResponse } from "next/server";

const ARENA_DEMO_LOGIN = "johnbm0";
const ARENA_DEMO_PASSWORD = "12345";
const ARENA_DEMO_TOKEN = "arena-demo-local-token";
const ARENA_DEMO_COOKIE = "hm51_arena_demo_session";
const COACH_DISABLED_COOKIE = "hm51_coach_profile_disabled";

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url, 307);
}

function clearArenaDemoCookie(response: NextResponse) {
  response.cookies.set({
    name: ARENA_DEMO_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function middleware(request: NextRequest) {
  try {
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
            return clearArenaDemoCookie(
              NextResponse.json(
                { result: false, error: "Неверный пароль" },
                { status: 401 },
              ),
            );
          }

          const response = NextResponse.json({
            result: true,
            token: ARENA_DEMO_TOKEN,
            new_token: ARENA_DEMO_TOKEN,
            redirect: "/calendar",
            data: { token: ARENA_DEMO_TOKEN },
            GAMER_TEAMS: [],
          });

          response.cookies.set({
            name: ARENA_DEMO_COOKIE,
            value: "1",
            httpOnly: true,
            sameSite: "lax",
            secure: true,
            path: "/",
            maxAge: 60 * 60 * 12,
          });

          return response;
        }
      } catch {
        // Non-JSON or ordinary login requests continue to the existing API.
      }

      return clearArenaDemoCookie(NextResponse.next());
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

    if (hasArenaDemoSession && pathname === "/calendar") {
      return redirectTo(request, "/arena-demo");
    }

    const coachProfileDisabled =
      request.cookies.get(COACH_DISABLED_COOKIE)?.value === "1";

    if (
      coachProfileDisabled &&
      (pathname === "/role-select" ||
        (pathname.startsWith("/coach") && pathname !== "/coach/profile-setup"))
    ) {
      return redirectTo(request, "/calendar");
    }

    if (isWebAppHost && pathname === "/") {
      return redirectTo(request, "/login");
    }

    return NextResponse.next();
  } catch (error) {
    console.error("XM 5.1 middleware error", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/",
    "/calendar",
    "/coach/:path*",
    "/role-select",
    "/arena-demo/:path*",
    "/api/login",
  ],
};
