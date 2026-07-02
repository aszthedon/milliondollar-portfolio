import { NextResponse } from "next/server";

import {
  createDashboardToken,
  getClientIpAddress,
  getDashboardAuthCookie,
  hashAdminIdentifier,
  verifyDashboardPassword,
} from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function logLoginAttempt({
  request,
  success,
  reason,
}: {
  request: Request;
  success: boolean;
  reason: string;
}) {
  try {
    const ipAddress = getClientIpAddress(request);
    const userAgent = request.headers.get("user-agent") ?? "unknown";

    await supabaseAdmin.from("admin_login_attempts").insert({
      ip_address: ipAddress,
      ip_hash: hashAdminIdentifier(ipAddress),
      user_agent: userAgent,
      user_agent_hash: hashAdminIdentifier(userAgent),
      success,
      reason,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Do not block login if logging table is missing/different.
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? "");

    if (!verifyDashboardPassword(password)) {
      await logLoginAttempt({
        request,
        success: false,
        reason: "invalid_password",
      });

      return NextResponse.json(
        {
          error: "Invalid dashboard password.",
        },
        {
          status: 401,
        }
      );
    }

    const token = createDashboardToken();

    await logLoginAttempt({
      request,
      success: true,
      reason: "login_success",
    });

    const response = NextResponse.json({
      token,
      expires_in_seconds: 60 * 60 * 12,
      message: "Dashboard unlocked.",
    });

    response.headers.set("Set-Cookie", getDashboardAuthCookie(token));

    return response;
  } catch (error) {
    console.error("DASHBOARD LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error: "Dashboard login failed.",
      },
      {
        status: 500,
      }
    );
  }
}