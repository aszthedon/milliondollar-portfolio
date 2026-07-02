import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "string" ? value : JSON.stringify(value);

  const escapedValue = stringValue.replaceAll('"', '""');

  return `"${escapedValue}"`;
}

function csvRow(values: unknown[]) {
  return values.map(escapeCsvValue).join(",");
}

function escapeSupabaseLikeSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function getExportFilters(request: Request) {
  const url = new URL(request.url);

  return {
    status: url.searchParams.get("status") ?? "all",
    search: (url.searchParams.get("search") ?? "").trim(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { status, search } = getExportFilters(request);

    let query = supabaseAdmin
      .from("admin_login_attempts")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      const safeSearch = escapeSupabaseLikeSearch(search);

      query = query.or(
        [
          `status.ilike.%${safeSearch}%`,
          `ip_address.ilike.%${safeSearch}%`,
          `user_agent.ilike.%${safeSearch}%`,
          `reason.ilike.%${safeSearch}%`,
        ].join(",")
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const headers = [
      "id",
      "status",
      "ip_address",
      "user_agent",
      "reason",
      "created_at",
    ];

    const rows = [
      csvRow(headers),
      ...(data ?? []).map((attempt) =>
        csvRow([
          attempt.id,
          attempt.status,
          attempt.ip_address,
          attempt.user_agent,
          attempt.reason,
          attempt.created_at,
        ])
      ),
    ];

    const csv = rows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-login-attempts.csv"`,
      },
    });
  } catch (error) {
    console.error("EXPORT ADMIN LOGIN ATTEMPTS ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin login attempts could not be exported.",
      },
      {
        status: 500,
      }
    );
  }
}