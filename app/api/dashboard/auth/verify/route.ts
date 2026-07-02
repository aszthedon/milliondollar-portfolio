import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return NextResponse.json({
    authenticated: true,
    message: "Dashboard session verified.",
  });
}