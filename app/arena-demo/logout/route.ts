import { NextRequest, NextResponse } from "next/server";

const ARENA_DEMO_COOKIE = "hm51_arena_demo_session";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";

  const response = NextResponse.redirect(url, 307);

  response.cookies.set({
    name: ARENA_DEMO_COOKIE,
    value: "",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
