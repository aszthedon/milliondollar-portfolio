import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE_NAME = "million-dollar-admin-session";

function getAdminSessionToken() {
  return process.env.ADMIN_SESSION_TOKEN ??
    process.env.ADMIN_DASHBOARD_SECRET ??
    process.env.CRON_SECRET ??
    "";
}

function isDashboardAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (isDashboardAsset(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = getAdminSessionToken();

  if (!sessionToken) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/dashboard-login";
    loginUrl.searchParams.set("reason", "missing_config");

    return NextResponse.redirect(loginUrl);
  }

  const cookieToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (cookieToken === sessionToken) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/dashboard-login";
  loginUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};