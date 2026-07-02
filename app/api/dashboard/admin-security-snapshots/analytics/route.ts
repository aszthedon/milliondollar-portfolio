import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
        average_score: number;
        lowest_score: number;
        highest_score: number;
        failed_attempts: number;
        locked_attempts: number;
        active_blocked_ips: number;
        suggested_blocks: number;
        suspicious_ips: number;
        average_failure_rate: number;
        healthy: number;
        review_suggested: number;
        needs_attention: number;
        score_total: number;
        failure_rate_total: number;
      }
    >();

    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date();

      date.setDate(date.getDate() - index);

      const key = date.toISOString().slice(0, 10);

      dailyMap.set(key, {
        date: key,
        snapshots: 0,
        average_score: 0,
        lowest_score: 0,
        highest_score: 0,
        failed_attempts: 0,
        locked_attempts: 0,
        active_blocked_ips: 0,
        suggested_blocks: 0,
        suspicious_ips: 0,
        average_failure_rate: 0,
        healthy: 0,
        review_suggested: 0,
        needs_attention: 0,
        score_total: 0,
        failure_rate_total: 0,
      });
    }

    for (const snapshot of data ?? []) {
      const key = dateKey(snapshot.created_at);
      const current = dailyMap.get(key);

      if (!current) {
        continue;
      }

      current.snapshots += 1;
      current.score_total += Number(snapshot.security_score ?? 0);
      current.failure_rate_total += Number(snapshot.failure_rate ?? 0);

      current.failed_attempts += Number(snapshot.failed_attempts ?? 0);
      current.locked_attempts += Number(snapshot.locked_attempts ?? 0);
      current.active_blocked_ips += Number(snapshot.active_blocked_ips ?? 0);
      current.suggested_blocks += Number(snapshot.suggested_blocks ?? 0);
      current.suspicious_ips += Number(snapshot.suspicious_ips ?? 0);

      const score = Number(snapshot.security_score ?? 0);

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

    const daily = Array.from(dailyMap.values()).map((day) => ({
      date: day.date,
      snapshots: day.snapshots,
      average_score:
        day.snapshots > 0 ? Math.round(day.score_total / day.snapshots) : 0,
      lowest_score: day.lowest_score,
      highest_score: day.highest_score,
      failed_attempts: day.failed_attempts,
      locked_attempts: day.locked_attempts,
      active_blocked_ips: day.active_blocked_ips,
      suggested_blocks: day.suggested_blocks,
      suspicious_ips: day.suspicious_ips,
      average_failure_rate:
        day.snapshots > 0
          ? Math.round(day.failure_rate_total / day.snapshots)
          : 0,
      healthy: day.healthy,
      review_suggested: day.review_suggested,
      needs_attention: day.needs_attention,
    }));

    return NextResponse.json({
      days,
      start_date: startDate,
      end_date: endDate,
      daily,
      message: "Admin security snapshot analytics loaded.",
    });
  } catch (error) {
    console.error("ADMIN SECURITY SNAPSHOT ANALYTICS ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin security snapshot analytics could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}