import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getDateKey(value: string | null | undefined) {
  if (!value) {
    return "unknown";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function countByKey<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined
) {
  return items.reduce<Record<string, number>>((summary, item) => {
    const key = getKey(item) || "unknown";

    summary[key] = (summary[key] ?? 0) + 1;

    return summary;
  }, {});
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
        ascending: true,
      })
      .limit(5000);

    if (error) {
      throw error;
    }

    const logs = data ?? [];

    const dailyMap = logs.reduce<
      Record<
        string,
        {
          date: string;
          total_count: number;
          success_count: number;
          warning_count: number;
          error_count: number;
          skipped_count: number;
        }
      >
    >((summary, log) => {
      const dateKey = getDateKey(log.created_at);

      if (!summary[dateKey]) {
        summary[dateKey] = {
          date: dateKey,
          total_count: 0,
          success_count: 0,
          warning_count: 0,
          error_count: 0,
          skipped_count: 0,
        };
      }

      summary[dateKey].total_count += 1;

      if (log.status === "success") {
        summary[dateKey].success_count += 1;
      }

      if (log.status === "warning") {
        summary[dateKey].warning_count += 1;
      }

      if (log.status === "error") {
        summary[dateKey].error_count += 1;
      }

      if (log.status === "skipped") {
        summary[dateKey].skipped_count += 1;
      }

      return summary;
    }, {});

    const summary = {
      days,
      total_count: logs.length,
      status_counts: countByKey(logs, (log) => log.status),
      cron_name_counts: countByKey(logs, (log) => log.cron_name),
      trigger_source_counts: countByKey(logs, (log) => log.trigger_source),
      latest_run_at: logs[logs.length - 1]?.created_at ?? null,
      first_run_at: logs[0]?.created_at ?? null,
      daily: Object.values(dailyMap),
    };

    return NextResponse.json({
      summary,
      message: "Cron run log analytics loaded.",
    });
  } catch (error) {
    console.error("CRON RUN LOG ANALYTICS ERROR:", error);

    return NextResponse.json(
      {
        error: "Cron run log analytics could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}