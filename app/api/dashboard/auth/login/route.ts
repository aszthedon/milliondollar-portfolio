import { NextResponse } from "next/server";

import {
  createDashboardToken,
  getClientIpAddress,
  getDashboardAuthCookie,
  getDashboardClearCookie,
  hashAdminIdentifier,
  verifyDashboardPassword,
} from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function isIpBlocked(ipAddress: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_ip_blocklist")
      .select("*")
      .eq("ip_address", ipAddress)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return false;
    }

    if (!data) {
      return false;
    }

    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function logAttempt({
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
      success,
      reason,
    });
  } catch {
    // Do not block login because logging failed.
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body.password ?? "");
    const ipAddress = getClientIpAddress(request);

    const blocked = await isIpBlocked(ipAddress);

    if (blocked) {
      await logAttempt({
        request,
        success: false,
        reason: "blocked_ip",
      });

      return NextResponse.json(
        {
          error: "This IP address is blocked from dashboard login.",
        },
        {
          status: 403,
        }
      );
    }

    if (!verifyDashboardPassword(password)) {
      await logAttempt({
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

    await logAttempt({
      request,
      success: true,
      reason: "login_success",
    });

    const token = createDashboardToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();

    const response = NextResponse.json({
      token,
      expires_at: expiresAt,
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

export async function DELETE() {
  const response = NextResponse.json({
    message: "Dashboard session cleared.",
  });

  response.headers.set("Set-Cookie", getDashboardClearCookie());

  return response;
}