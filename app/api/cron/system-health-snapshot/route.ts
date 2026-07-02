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

function startOfTodayIso() {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date.toISOString();
}

function startOfTomorrowIso() {
  const date = new Date();

  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);

  return date.toISOString();
}

function startOfDayOffsetIso(offsetDays: number) {
  const date = new Date();

  date.setDate(date.getDate() + offsetDays);
  date.setHours(0, 0, 0, 0);

  return date.toISOString();
}

function cronHealthStatus({
  lastSuccess,
  lastError,
}: {
  lastSuccess?: { created_at: string } | null;
  lastError?: { created_at: string } | null;
}) {
  if (!lastSuccess && !lastError) {
    return "No Runs Yet";
  }

  if (
    lastError &&
    (!lastSuccess ||
      new Date(lastError.created_at).getTime() >
        new Date(lastSuccess.created_at).getTime())
  ) {
    return "Needs Attention";
  }

  return "Healthy";
}

function buildReportText({
  systemHealthStatus,
  issues,
  reminderHealth,
  portalHealth,
  cronHealth,
}: {
  systemHealthStatus: string;
  issues: string[];
  reminderHealth: Record<string, number>;
  portalHealth: Record<string, number>;
  cronHealth: Record<string, string | number>;
}) {
  return [
    "Automatic System Health Snapshot",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    `Overall Status: ${systemHealthStatus}`,
    "",
    "Reminder Health",
    `- Bookings Today: ${reminderHealth.today_bookings}`,
    `- Bookings Tomorrow: ${reminderHealth.tomorrow_bookings}`,
    `- Unsent 24-Hour Reminders: ${reminderHealth.unsent_24h_reminders}`,
    `- Unsent 1-Hour Reminders: ${reminderHealth.unsent_1h_reminders}`,
    "",
    "Portal Follow-Up Health",
    `- Portal Follow-Ups Due: ${portalHealth.due}`,
    `- Ready to Follow Up: ${portalHealth.ready}`,
    `- In Cooldown: ${portalHealth.cooldown}`,
    "",
    "Cron Health",
    `- Reminder Cron: ${cronHealth.reminder_status}`,
    `- Portal Follow-Up Cron: ${cronHealth.portal_status}`,
    `- Total Cron Runs in Range: ${cronHealth.total_runs}`,
    `- Cron Successes: ${cronHealth.successes}`,
    `- Cron Errors: ${cronHealth.errors}`,
    `- Cron Error Rate: ${cronHealth.error_rate}%`,
    "",
    "Current Issues",
    issues.length > 0 ? issues.map((issue) => `- ${issue}`).join("\n") : "No current issues detected.",
  ].join("\n");
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

  const triggerSource = getCronTriggerSource(request);

  try {
    const today = startOfTodayIso();
    const tomorrow = startOfTomorrowIso();
    const dayAfterTomorrow = startOfDayOffsetIso(2);
    const sevenDaysAgo = startOfDayOffsetIso(-6);

    const { count: todayBookings } = await supabaseAdmin
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte("booking_date", today.slice(0, 10))
      .lt("booking_date", tomorrow.slice(0, 10))
      .in("status", ["confirmed", "approved", "rescheduled"]);

    const { count: tomorrowBookings } = await supabaseAdmin
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte("booking_date", tomorrow.slice(0, 10))
      .lt("booking_date", dayAfterTomorrow.slice(0, 10))
      .in("status", ["confirmed", "approved", "rescheduled"]);

    const { count: unsent24hReminders } = await supabaseAdmin
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte("booking_date", today.slice(0, 10))
      .lte("booking_date", tomorrow.slice(0, 10))
      .in("status", ["confirmed", "approved", "rescheduled"])
      .or("reminder_24h_sent.is.null,reminder_24h_sent.eq.false");

    const { count: unsent1hReminders } = await supabaseAdmin
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("booking_date", today.slice(0, 10))
      .in("status", ["confirmed", "approved", "rescheduled"])
      .or("reminder_1h_sent.is.null,reminder_1h_sent.eq.false");

    const { data: portalClients } = await supabaseAdmin
      .from("crm_clients")
      .select(
        "id, project_portal_token, project_portal_token_created_at, project_portal_last_accessed_at, project_portal_last_followed_up_at"
      )
      .not("project_portal_token", "is", null);

    const now = new Date();

    const portalDueClients =
      portalClients?.filter((client) => {
        if (client.project_portal_last_accessed_at) {
          return false;
        }

        const tokenCreatedAt =
          client.project_portal_token_created_at ?? new Date().toISOString();

        const tokenAgeDays =
          (now.getTime() - new Date(tokenCreatedAt).getTime()) /
          (1000 * 60 * 60 * 24);

        const lastFollowedUpAt = client.project_portal_last_followed_up_at;

        if (!lastFollowedUpAt) {
          return tokenAgeDays >= 3;
        }

        const followUpAgeDays =
          (now.getTime() - new Date(lastFollowedUpAt).getTime()) /
          (1000 * 60 * 60 * 24);

        return followUpAgeDays >= 3;
      }) ?? [];

    const portalReady = portalDueClients.filter((client) => {
      if (!client.project_portal_last_followed_up_at) {
        return true;
      }

      const minutesSinceFollowUp =
        (now.getTime() -
          new Date(client.project_portal_last_followed_up_at).getTime()) /
        (1000 * 60);

      return minutesSinceFollowUp >= 30;
    });

    const { data: cronLogs } = await supabaseAdmin
      .from("cron_run_logs")
      .select("cron_name, trigger_source, status, created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", {
        ascending: false,
      });

    const reminderSuccess = cronLogs?.find(
      (log) => log.cron_name === "booking_reminders" && log.status === "success"
    );

    const reminderError = cronLogs?.find(
      (log) => log.cron_name === "booking_reminders" && log.status === "error"
    );

    const portalSuccess = cronLogs?.find(
      (log) =>
        log.cron_name === "project_portal_follow_ups" &&
        log.status === "success"
    );

    const portalError = cronLogs?.find(
      (log) =>
        log.cron_name === "project_portal_follow_ups" && log.status === "error"
    );

    const reminderStatus = cronHealthStatus({
      lastSuccess: reminderSuccess,
      lastError: reminderError,
    });

    const portalStatus = cronHealthStatus({
      lastSuccess: portalSuccess,
      lastError: portalError,
    });

    const totalRuns = cronLogs?.length ?? 0;
    const successes = cronLogs?.filter((log) => log.status === "success").length ?? 0;
    const errors = cronLogs?.filter((log) => log.status === "error").length ?? 0;
    const errorRate =
      totalRuns > 0 ? Math.round((errors / totalRuns) * 100) : 0;

    const reminderHealth = {
      today_bookings: todayBookings ?? 0,
      tomorrow_bookings: tomorrowBookings ?? 0,
      unsent_24h_reminders: unsent24hReminders ?? 0,
      unsent_1h_reminders: unsent1hReminders ?? 0,
    };

    const portalHealth = {
      due: portalDueClients.length,
      ready: portalReady.length,
      cooldown: portalDueClients.length - portalReady.length,
    };

    const cronHealth = {
      reminder_status: reminderStatus,
      portal_status: portalStatus,
      selected_range_days: 7,
      total_runs: totalRuns,
      successes,
      errors,
      error_rate: errorRate,
      threshold: 3,
    };

    const issues = [
      reminderStatus === "Needs Attention" ? "Reminder cron needs attention" : null,
      portalStatus === "Needs Attention"
        ? "Portal follow-up cron needs attention"
        : null,
      errors >= 3 ? "Cron error threshold reached" : null,
      reminderHealth.unsent_24h_reminders > 0
        ? `${reminderHealth.unsent_24h_reminders} unsent 24-hour reminders`
        : null,
      reminderHealth.unsent_1h_reminders > 0
        ? `${reminderHealth.unsent_1h_reminders} unsent 1-hour reminders`
        : null,
      portalHealth.due > 0 ? `${portalHealth.due} portal follow-ups due` : null,
    ].filter(Boolean) as string[];

    const systemHealthStatus =
      issues.length === 0
        ? "Healthy"
        : reminderStatus === "Needs Attention" ||
            portalStatus === "Needs Attention" ||
            errors >= 3
          ? "Needs Attention"
          : "Review Suggested";

    const reportText = buildReportText({
      systemHealthStatus,
      issues,
      reminderHealth,
      portalHealth,
      cronHealth,
    });

    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from("system_health_snapshots")
      .insert({
        status: systemHealthStatus,
        issue_count: issues.length,
        issues,
        reminder_health: reminderHealth,
        portal_follow_up_health: portalHealth,
        cron_health: cronHealth,
        report_text: reportText,
        trigger_source: triggerSource,
      })
      .select("*")
      .single();

    if (snapshotError) {
      throw snapshotError;
    }

    const message = `Automatic system health snapshot saved with status: ${systemHealthStatus}.`;

    await logCronRun({
      cronName: "system_health_snapshot",
      triggerSource,
      status: "success",
      message,
      resultSummary: {
        snapshot_id: snapshot.id,
        system_health_status: systemHealthStatus,
        issue_count: issues.length,
        cron_errors: errors,
        portal_follow_ups_due: portalHealth.due,
      },
    });

    return NextResponse.json({
      snapshot,
      message,
    });
  } catch (error) {
    console.error("AUTOMATIC SYSTEM HEALTH SNAPSHOT ERROR:", error);

    await logCronRun({
      cronName: "system_health_snapshot",
      triggerSource,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Automatic system health snapshot failed.",
    });

    return NextResponse.json(
      {
        error: "Automatic system health snapshot could not be saved.",
      },
      {
        status: 500,
      }
    );
  }
}