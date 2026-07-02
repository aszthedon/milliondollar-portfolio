import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue =
    typeof value === "string" ? value : JSON.stringify(value);

  return `"${stringValue.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(escapeCsvValue).join(",");
}

function getDateRange(days = 30) {
  const endDate = new Date();
  const startDate = new Date();

  startDate.setDate(startDate.getDate() - days + 1);
  startDate.setHours(0, 0, 0, 0);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

function dateKey(value: string) {
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
      Number.isFinite(rawDays) && rawDays >= 1 ? Math.min(rawDays, 90) : 30;

    const { startDate, endDate } = getDateRange(days);

    const { data, error } = await supabaseAdmin
      .from("admin_security_snapshots")
      .select(
        "security_score, status, failed_attempts, locked_attempts, active_blocked_ips, suggested_blocks, suspicious_ips, failure_rate, created_at"
      )
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    const dailyMap = new Map<
      string,
      {
        date: string;
        snapshots: number;
        score_total: number;
        lowest_score: number;
        highest_score: number;
        failed_attempts: number;
        locked_attempts: number;
        active_blocked_ips: number;
        suggested_blocks: number;
        suspicious_ips: number;
        failure_rate_total: number;
        healthy: number;
        review_suggested: number;
        needs_attention: number;
      }
    >();

    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date();

      date.setDate(date.getDate() - index);

      const key = date.toISOString().slice(0, 10);

      dailyMap.set(key, {
        date: key,
        snapshots: 0,
        score_total: 0,
        lowest_score: 0,
        highest_score: 0,
        failed_attempts: 0,
        locked_attempts: 0,
        active_blocked_ips: 0,
        suggested_blocks: 0,
        suspicious_ips: 0,
        failure_rate_total: 0,
        healthy: 0,
        review_suggested: 0,
        needs_attention: 0,
      });
    }

    for (const snapshot of data ?? []) {
      const key = dateKey(snapshot.created_at);
      const current = dailyMap.get(key);

      if (!current) {
        continue;
      }

      const score = Number(snapshot.security_score ?? 0);

      current.snapshots += 1;
      current.score_total += score;
      current.failure_rate_total += Number(snapshot.failure_rate ?? 0);
      current.failed_attempts += Number(snapshot.failed_attempts ?? 0);
      current.locked_attempts += Number(snapshot.locked_attempts ?? 0);
      current.active_blocked_ips += Number(snapshot.active_blocked_ips ?? 0);
      current.suggested_blocks += Number(snapshot.suggested_blocks ?? 0);
      current.suspicious_ips += Number(snapshot.suspicious_ips ?? 0);

      if (current.snapshots === 1) {
        current.lowest_score = score;
        current.highest_score = score;
      } else {
        current.lowest_score = Math.min(current.lowest_score, score);
        current.highest_score = Math.max(current.highest_score, score);
      }

      if (snapshot.status === "Healthy") {
        current.healthy += 1;
      }

      if (snapshot.status === "Review Suggested") {
        current.review_suggested += 1;
      }

      if (snapshot.status === "Needs Attention") {
        current.needs_attention += 1;
      }
    }

    const headers = [
      "date",
      "snapshots",
      "average_score",
      "lowest_score",
      "highest_score",
      "failed_attempts",
      "locked_attempts",
      "active_blocked_ips",
      "suggested_blocks",
      "suspicious_ips",
      "average_failure_rate",
      "healthy",
      "review_suggested",
      "needs_attention",
    ];

    const rows = [
      csvRow(headers),
      ...Array.from(dailyMap.values()).map((day) =>
        csvRow([
          day.date,
          day.snapshots,
          day.snapshots > 0
            ? Math.round(day.score_total / day.snapshots)
            : 0,
          day.lowest_score,
          day.highest_score,
          day.failed_attempts,
          day.locked_attempts,
          day.active_blocked_ips,
          day.suggested_blocks,
          day.suspicious_ips,
          day.snapshots > 0
            ? Math.round(day.failure_rate_total / day.snapshots)
            : 0,
          day.healthy,
          day.review_suggested,
          day.needs_attention,
        ])
      ),
    ];

    return new NextResponse(rows.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-security-snapshot-trends-${days}-days.csv"`,
      },
    });
  } catch (error) {
    console.error("EXPORT ADMIN SECURITY SNAPSHOT ANALYTICS ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin security snapshot analytics could not be exported.",
      },
      {
        status: 500,
      }
    );
  }
}