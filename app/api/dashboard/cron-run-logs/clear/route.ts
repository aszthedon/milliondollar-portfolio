import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getRetentionDays(value: unknown) {
  const days = Number(value ?? 365);

  if (!Number.isFinite(days) || days < 1) {
    return 365;
  }

  return Math.min(days, 3650);
}

function getCutoffDate(days: number) {
  const cutoff = new Date();

  cutoff.setDate(cutoff.getDate() - days);

  return cutoff.toISOString();
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const days = getRetentionDays(body.days);
    const cutoffDate = getCutoffDate(days);

    const { data: oldLogs, error: oldLogsError } = await supabaseAdmin
      .from("cron_run_logs")
      .select("id")
      .lt("created_at", cutoffDate)
      .limit(5000);

    if (oldLogsError) {
      throw oldLogsError;
    }

    const ids = (oldLogs ?? []).map((log) => log.id);

    if (ids.length === 0) {
      return NextResponse.json({
        deleted_count: 0,
        cutoff_date: cutoffDate,
        message: "No old cron run logs found.",
      });
    }

    const { data: deletedLogs, error: deleteError } = await supabaseAdmin
      .from("cron_run_logs")
      .delete()
      .in("id", ids)
      .select("id");

    if (deleteError) {
      throw deleteError;
    }

    const deletedCount = deletedLogs?.length ?? 0;

    return NextResponse.json({
      deleted_count: deletedCount,
      cutoff_date: cutoffDate,
      message: `${deletedCount} cron run log${
        deletedCount === 1 ? "" : "s"
      } deleted.`,
    });
  } catch (error) {
    console.error("CLEAR CRON RUN LOGS ERROR:", error);

    return NextResponse.json(
      {
        error: "Cron run logs could not be cleared.",
      },
      {
        status: 500,
      }
    );
  }
}