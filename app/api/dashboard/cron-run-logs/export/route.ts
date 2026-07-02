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

    const cronName = String(url.searchParams.get("cron_name") ?? "all").trim();
    const status = String(url.searchParams.get("status") ?? "all").trim();

    let query = supabaseAdmin
      .from("cron_run_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(5000);

    if (cronName !== "all") {
      query = query.eq("cron_name", cronName);
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const rows = data ?? [];

    const headers = [
      "id",
      "cron_name",
      "trigger_source",
      "status",
      "message",
      "result_summary",
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
        "Content-Disposition": `attachment; filename="cron-run-logs.csv"`,
      },
    });
  } catch (error) {
    console.error("CRON RUN LOGS EXPORT ERROR:", error);

    return NextResponse.json(
      {
        error: "Cron run logs could not be exported.",
      },
      {
        status: 500,
      }
    );
  }
}