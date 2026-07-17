import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;

  if (
    request.nextUrl.pathname === "/" &&
    (hostname === "app.hm5-1.ru" || hostname === "hm51-next.vercel.app")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
