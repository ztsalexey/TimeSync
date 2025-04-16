import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, _next routes, and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Skip the root path (home page)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // For all other paths, assume it's an event slug
  // The [slug] dynamic route will handle it
  return NextResponse.next();
}
