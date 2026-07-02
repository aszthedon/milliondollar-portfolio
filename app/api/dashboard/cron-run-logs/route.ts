import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const url = new URL(request.url);

    const rawLimit = Number(url.searchParams.get("limit") ?? 25);
    const rawOffset = Number(url.searchParams.get("offset") ?? 0);
    const cronName = String(url.searchParams.get("cron_name") ?? "all").trim();
    const status = String(url.searchParams.get("status") ?? "all").trim();
    const search = String(url.searchParams.get("search") ?? "").trim();

    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 25;

    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    let query = supabaseAdmin
      .from("cron_run_logs")
      .select("*", {
        count: "exact",
      })
      .order("created_at", {
        ascending: false,
      });

    if (cronName !== "all") {
      query = query.eq("cron_name", cronName);
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        [
          `cron_name.ilike.%${search}%`,
          `trigger_source.ilike.%${search}%`,
          `status.ilike.%${search}%`,
          `message.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      throw error;
    }

    const logs = data ?? [];

    const summary = {
      total_count: count ?? 0,
      loaded_count: logs.length,
      success_loaded_count: logs.filter((log) => log.status === "success")
        .length,
      warning_loaded_count: logs.filter((log) => log.status === "warning")
        .length,
      error_loaded_count: logs.filter((log) => log.status === "error").length,
      latest_run_at: logs[0]?.created_at ?? null,
    };

    return NextResponse.json({
      logs,
      summary,
      count: count ?? 0,
      has_more: offset + limit < (count ?? 0),
      next_offset: offset + limit,
      message: "Cron run logs loaded.",
    });
  } catch (error) {
    console.error("CRON RUN LOGS ERROR:", error);

    return NextResponse.json(
      {
        error: "Cron run logs could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}