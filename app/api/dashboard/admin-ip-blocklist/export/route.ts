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

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const url = new URL(request.url);

    const status = url.searchParams.get("status") ?? "all";
    const search = (url.searchParams.get("search") ?? "").trim();

    let query = supabaseAdmin
      .from("admin_ip_blocklist")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (status === "active") {
      query = query.eq("is_active", true);
    }

    if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    if (search) {
      const safeSearch = escapeSupabaseLikeSearch(search);

      query = query.or(
        [
          `ip_address.ilike.%${safeSearch}%`,
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
      "ip_address",
      "reason",
      "is_active",
      "blocked_at",
      "created_at",
    ];

    const rows = [
      csvRow(headers),
      ...(data ?? []).map((item) =>
        csvRow([
          item.id,
          item.ip_address,
          item.reason,
          item.is_active,
          item.blocked_at,
          item.created_at,
        ])
      ),
    ];

    const csv = rows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-ip-blocklist.csv"`,
      },
    });
  } catch (error) {
    console.error("EXPORT ADMIN IP BLOCKLIST ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin IP blocklist could not be exported.",
      },
      {
        status: 500,
      }
    );
  }
}