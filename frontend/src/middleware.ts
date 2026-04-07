import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/gallery/admin", "/gallery/submit", "/gallery/my-submissions"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a protected route
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isProtected) return NextResponse.next();

  // Check for Supabase auth cookie (pattern: sb-*-auth-token)
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => /^sb-.+-auth-token/.test(cookie.name));

  if (!hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/gallery/admin/:path*", "/gallery/submit/:path*", "/gallery/my-submissions/:path*"],
};
