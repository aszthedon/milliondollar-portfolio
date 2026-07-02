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

  return url.searchParams.get("secret") === cronSecret;
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

function getDateRange(days = 14) {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

function calculateSecurityScore({
  failedAttempts,
  lockedAttempts,
  failureRate,
  suggestedBlocks,
}: {
  failedAttempts: number;
  lockedAttempts: number;
  failureRate: number;
  suggestedBlocks: number;
}) {
  return Math.max(
    0,
    100 -
      failedAttempts * 5 -
      lockedAttempts * 12 -
      Math.max(0, failureRate - 10) -
      suggestedBlocks * 8
  );
}

function getSecurityStatus(score: number) {
  if (score >= 90) {
    return "Healthy";
  }

  if (score >= 70) {
    return "Review Suggested";
  }

  return "Needs Attention";
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
    const { startDate, endDate } = getDateRange(14);

    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("status, ip_address, created_at")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (attemptsError) {
      throw attemptsError;
    }

    const { data: blockedIps, error: blockedIpsError } = await supabaseAdmin
      .from("admin_ip_blocklist")
      .select("ip_address, is_active");

    if (blockedIpsError) {
      throw blockedIpsError;
    }

    const failedAttempts =
      attempts?.filter((attempt) => attempt.status === "failed").length ?? 0;

    const lockedAttempts =
      attempts?.filter((attempt) => attempt.status === "locked").length ?? 0;

    const totalAttempts = attempts?.length ?? 0;

    const failureRate =
      totalAttempts > 0
        ? Math.round(((failedAttempts + lockedAttempts) / totalAttempts) * 100)
        : 0;

    const activeBlockedIps =
      blockedIps?.filter((ip) => ip.is_active).length ?? 0;

    const activeBlockedSet = new Set(
      (blockedIps ?? [])
        .filter((item) => item.is_active)
        .map((item) => item.ip_address)
    );

    const ipTotals = new Map<
      string,
      {
        ip: string;
        total: number;
        failed: number;
        locked: number;
      }
    >();

    for (const attempt of attempts ?? []) {
      const ip = attempt.ip_address ?? "unknown";

      if (!ipTotals.has(ip)) {
        ipTotals.set(ip, {
          ip,
          total: 0,
          failed: 0,
          locked: 0,
        });
      }

      const current = ipTotals.get(ip)!;

      current.total += 1;

      if (attempt.status === "failed") {
        current.failed += 1;
      }

      if (attempt.status === "locked") {
        current.locked += 1;
      }
    }

    const suspiciousIps = Array.from(ipTotals.values()).filter(
      (item) => item.ip !== "unknown" && (item.failed >= 2 || item.locked > 0)
    );

    const suggestedBlocks = suspiciousIps.filter(
      (item) =>
        !activeBlockedSet.has(item.ip) && (item.locked > 0 || item.failed >= 3)
    ).length;

    const securityScore = calculateSecurityScore({
      failedAttempts,
      lockedAttempts,
      failureRate,
      suggestedBlocks,
    });

    const status = getSecurityStatus(securityScore);

    const reportText = [
      "Automatic Admin Security Snapshot",
      "",
      `Generated: ${new Date().toLocaleString()}`,
      "Range: Last 14 days",
      `Security Score: ${securityScore}`,
      `Status: ${status}`,
      "",
      `Failed Attempts: ${failedAttempts}`,
      `Locked Attempts: ${lockedAttempts}`,
      `Failure Rate: ${failureRate}%`,
      `Active Blocked IPs: ${activeBlockedIps}`,
      `Suspicious IPs: ${suspiciousIps.length}`,
      `Suggested Blocks: ${suggestedBlocks}`,
    ].join("\n");

    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from("admin_security_snapshots")
      .insert({
        security_score: securityScore,
        status,
        failed_attempts: failedAttempts,
        locked_attempts: lockedAttempts,
        active_blocked_ips: activeBlockedIps,
        suggested_blocks: suggestedBlocks,
        suspicious_ips: suspiciousIps.length,
        failure_rate: failureRate,
        report_text: reportText,
        trigger_source: triggerSource,
      })
      .select("*")
      .single();

    if (snapshotError) {
      throw snapshotError;
    }

    await logCronRun({
      cronName: "admin_security_snapshot",
      triggerSource,
      status: "success",
      message: `Admin security snapshot saved with score ${securityScore}.`,
      resultSummary: {
        security_score: securityScore,
        status,
        failed_attempts: failedAttempts,
        locked_attempts: lockedAttempts,
        active_blocked_ips: activeBlockedIps,
        suspicious_ips: suspiciousIps.length,
        suggested_blocks: suggestedBlocks,
        failure_rate: failureRate,
      },
    });

    return NextResponse.json({
      snapshot,
      message: `Admin security snapshot saved with score ${securityScore}.`,
    });
  } catch (error) {
    console.error("ADMIN SECURITY SNAPSHOT CRON ERROR:", error);

    await logCronRun({
      cronName: "admin_security_snapshot",
      triggerSource,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Admin security snapshot cron failed.",
      resultSummary: {},
    });

    return NextResponse.json(
      {
        error: "Admin security snapshot cron failed.",
      },
      {
        status: 500,
      }
    );
  }
}