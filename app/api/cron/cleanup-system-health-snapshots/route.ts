import { NextResponse } from "next/server";

import { logCronRun } from "@/lib/logCronRun";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");

  if (authorization === `Bearer ${cronSecret}`) {
    return true;
  }

  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  return secret === cronSecret;
}

function getCronTriggerSource(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    return "vercel_scheduled";
  }

  const url = new URL(request.url);

  if (url.searchParams.get("secret")) {
    return "manual_secret_url";
  }

  return "unknown";
}

function getRetentionDays(request: Request) {
  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get("days") ?? 90);

  if (!Number.isFinite(rawDays) || rawDays < 1) {
    return 90;
  }

  return Math.min(rawDays, 365);
}

function cutoffDateFromDays(days: number) {
  const cutoff = new Date();

  cutoff.setDate(cutoff.getDate() - days);

  return cutoff.toISOString();
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized cron request.",
      },
      {
        status: 401,
      }
    );
  }

  const retentionDays = getRetentionDays(request);
  const cutoffDate = cutoffDateFromDays(retentionDays);

  try {
    const { data: deletedSnapshots, error } = await supabaseAdmin
      .from("system_health_snapshots")
      .delete()
      .lt("created_at", cutoffDate)
      .select("id, status, issue_count, trigger_source, created_at");

    if (error) {
      console.error("SYSTEM HEALTH SNAPSHOT CLEANUP ERROR:", error);

      await logCronRun({
        cronName: "system_health_snapshot_cleanup",
        triggerSource: getCronTriggerSource(request),
        status: "error",
        message: "System health snapshot cleanup failed.",
        resultSummary: {
          retention_days: retentionDays,
          cutoff_date: cutoffDate,
          error: error.message,
        },
      });

      return NextResponse.json(
        {
          error: "System health snapshots could not be cleaned up.",
        },
        {
          status: 500,
        }
      );
    }

    const deletedCount = deletedSnapshots?.length ?? 0;

    const message = `${deletedCount} system health snapshot${
      deletedCount === 1 ? "" : "s"
    } older than ${retentionDays} day${
      retentionDays === 1 ? "" : "s"
    } cleaned up.`;

    await logCronRun({
      cronName: "system_health_snapshot_cleanup",
      triggerSource: getCronTriggerSource(request),
      status: "success",
      message,
      resultSummary: {
        retention_days: retentionDays,
        cutoff_date: cutoffDate,
        deleted_count: deletedCount,
      },
    });

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      retention_days: retentionDays,
      cutoff_date: cutoffDate,
      deleted_count: deletedCount,
      message,
    });
  } catch (error) {
    console.error("SYSTEM HEALTH SNAPSHOT CLEANUP UNEXPECTED ERROR:", error);

    await logCronRun({
      cronName: "system_health_snapshot_cleanup",
      triggerSource: getCronTriggerSource(request),
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error cleaning up system health snapshots.",
      resultSummary: {
        retention_days: retentionDays,
        cutoff_date: cutoffDate,
      },
    });

    return NextResponse.json(
      {
        error: "Unexpected error cleaning up system health snapshots.",
      },
      {
        status: 500,
      }
    );
  }
}