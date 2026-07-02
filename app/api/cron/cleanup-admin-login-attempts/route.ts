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
  const rawDays = Number(url.searchParams.get("days") ?? 30);

  if (!Number.isFinite(rawDays) || rawDays < 1) {
    return 30;
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
    const { data: deletedAttempts, error } = await supabaseAdmin
      .from("admin_login_attempts")
      .delete()
      .lt("created_at", cutoffDate)
      .select("id, status, created_at");

    if (error) {
      await logCronRun({
        cronName: "admin_login_attempt_cleanup",
        triggerSource: getCronTriggerSource(request),
        status: "error",
        message: "Admin login attempt cleanup failed.",
        resultSummary: {
          retention_days: retentionDays,
          cutoff_date: cutoffDate,
          error: error.message,
        },
      });

      return NextResponse.json(
        {
          error: "Admin login attempts could not be cleaned up.",
        },
        {
          status: 500,
        }
      );
    }

    const deletedCount = deletedAttempts?.length ?? 0;

    const message = `${deletedCount} admin login attempt${
      deletedCount === 1 ? "" : "s"
    } older than ${retentionDays} day${
      retentionDays === 1 ? "" : "s"
    } cleaned up.`;

    await logCronRun({
      cronName: "admin_login_attempt_cleanup",
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
    console.error("ADMIN LOGIN ATTEMPT CLEANUP ERROR:", error);

    await logCronRun({
      cronName: "admin_login_attempt_cleanup",
      triggerSource: getCronTriggerSource(request),
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected admin login attempt cleanup error.",
      resultSummary: {
        retention_days: retentionDays,
        cutoff_date: cutoffDate,
      },
    });

    return NextResponse.json(
      {
        error: "Unexpected error cleaning admin login attempts.",
      },
      {
        status: 500,
      }
    );
  }
}