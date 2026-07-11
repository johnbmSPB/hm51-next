import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  if ((hostname === "app.hm5-1.ru" || hostname.startsWith("hm51-next")) && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/app-start";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
