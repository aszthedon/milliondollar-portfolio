import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const url = new URL(request.url);
    const status = String(url.searchParams.get("status") ?? "all").trim();

    let query = supabaseAdmin
      .from("system_health_snapshots")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(5000);

    if (status !== "all") {
      query = query.or(`health_status.eq.${status},status.eq.${status}`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = data ?? [];

    const headers = [
      "id",
      "snapshot_type",
      "health_status",
      "status",
      "message",
      "metrics",
      "component_statuses",
      "issues",
      "metadata",
      "created_at",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => escapeCsvValue(row[header as keyof typeof row]))
          .join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="system-health-snapshots.csv"`,
      },
    });
  } catch (error) {
    console.error("SYSTEM HEALTH SNAPSHOTS EXPORT ERROR:", error);

    return NextResponse.json(
      {
        error: "System health snapshots could not be exported.",
      },
      {
        status: 500,
      }
    );
  }
}