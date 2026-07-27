import { NextResponse, type NextRequest } from "next/server";
const SESSION_COOKIE = "ordo_session";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const publicPath = path === "/anmelden" || path.startsWith("/_next/") || path === "/favicon.ico" || path.startsWith("/downloads/");
  if (!publicPath && !request.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/anmelden", request.url);
    const returnTarget = `${path}${request.nextUrl.search}`;
    if (returnTarget.startsWith("/") && !returnTarget.startsWith("//")) {
      url.searchParams.set("weiter", returnTarget);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
