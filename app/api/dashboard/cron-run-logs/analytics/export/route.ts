import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function getDateKey(value: string | null | undefined) {
  if (!value) {
    return "unknown";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const url = new URL(request.url);

    const rawDays = Number(url.searchParams.get("days") ?? 30);

    const days =
      Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 3650) : 30;

    const cutoff = new Date();

    cutoff.setDate(cutoff.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from("cron_run_logs")
      .select("*")
      .gte("created_at", cutoff.toISOString())
      .order("created_at", {
        ascending: false,
      })
      .limit(5000);

    if (error) {
      throw error;
    }

    const rows = data ?? [];

    const headers = [
      "id",
      "date",
      "cron_name",
      "trigger_source",
      "status",
      "message",
      "created_at",
    ];

    const csv = [
      headers.join(","),
      ...rows.map((row) => {
        const mappedRow = {
          ...row,
          date: getDateKey(row.created_at),
        };

        return headers
          .map((header) =>
            escapeCsvValue(mappedRow[header as keyof typeof mappedRow])
          )
          .join(",");
      }),
    ].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cron-run-log-analytics.csv"`,
      },
    });
  } catch (error) {
    console.error("CRON RUN LOG ANALYTICS EXPORT ERROR:", error);

    return NextResponse.json(
      {
        error: "Cron run log analytics could not be exported.",
      },
      {
        status: 500,
      }
    );
  }
}