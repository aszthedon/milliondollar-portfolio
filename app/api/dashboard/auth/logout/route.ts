import { NextResponse } from "next/server";

import { getDashboardClearCookie } from "@/lib/security/adminGuard";

export async function POST() {
  const response = NextResponse.json({
    message: "Dashboard logged out.",
  });

  response.headers.set("Set-Cookie", getDashboardClearCookie());

  return response;
}

export async function GET() {
  const response = NextResponse.json({
    message: "Dashboard logged out.",
  });

  response.headers.set("Set-Cookie", getDashboardClearCookie());

  return response;
}