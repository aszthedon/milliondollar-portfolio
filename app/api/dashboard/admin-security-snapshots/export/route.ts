import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "string" ? value : JSON.stringify(value);

  return `"${stringValue.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(escapeCsvValue).join(",");
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("admin_security_snapshots")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(1000);

    if (error) {
      throw error;
    }

    const headers = [
      "id",
      "security_score",
      "status",
      "failed_attempts",
      "locked_attempts",
      "active_blocked_ips",
      "suggested_blocks",
      "suspicious_ips",
      "failure_rate",
      "trigger_source",
      "created_at",
    ];

    const rows = [
      csvRow(headers),
      ...(data ?? []).map((snapshot) =>
        csvRow([
          snapshot.id,
          snapshot.security_score,
          snapshot.status,
          snapshot.failed_attempts,
          snapshot.locked_attempts,
          snapshot.active_blocked_ips,
          snapshot.suggested_blocks,
          snapshot.suspicious_ips,
          snapshot.failure_rate,
          snapshot.trigger_source,
          snapshot.created_at,
        ])
      ),
    ];

    return new NextResponse(rows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-security-snapshots.csv"`,
      },
    });
  } catch (error) {
    console.error("EXPORT ADMIN SECURITY SNAPSHOTS ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin security snapshots could not be exported.",
      },
      {
        status: 500,
      }
    );
  }
}