import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
    const rawDays = Number(url.searchParams.get("days") ?? 14);

    const days =
      Number.isFinite(rawDays) && rawDays >= 1 ? Math.min(rawDays, 90) : 14;

    const { startDate, endDate } = getDateRange(days);

    const { data, error } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("status, ip_address, created_at")
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
        total: number;
        success: number;
        failed: number;
        locked: number;
        unique_ips: number;
        ips: Set<string>;
      }
    >();

    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date();

      date.setDate(date.getDate() - index);

      const key = date.toISOString().slice(0, 10);

      dailyMap.set(key, {
        date: key,
        total: 0,
        success: 0,
        failed: 0,
        locked: 0,
        unique_ips: 0,
        ips: new Set<string>(),
      });
    }

    for (const attempt of data ?? []) {
      const key = dateKey(attempt.created_at);
      const current = dailyMap.get(key);

      if (!current) {
        continue;
      }

      current.total += 1;

      if (attempt.status === "success") {
        current.success += 1;
      }

      if (attempt.status === "failed") {
        current.failed += 1;
      }

      if (attempt.status === "locked") {
        current.locked += 1;
      }

      if (attempt.ip_address) {
        current.ips.add(attempt.ip_address);
      }
    }

    const daily = Array.from(dailyMap.values()).map((day) => ({
      date: day.date,
      total: day.total,
      success: day.success,
      failed: day.failed,
      locked: day.locked,
      unique_ips: day.ips.size,
    }));

    return NextResponse.json({
      days,
      start_date: startDate,
      end_date: endDate,
      daily,
      message: "Admin login attempt analytics loaded.",
    });
  } catch (error) {
    console.error("ADMIN LOGIN ATTEMPT ANALYTICS ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin login attempt analytics could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}