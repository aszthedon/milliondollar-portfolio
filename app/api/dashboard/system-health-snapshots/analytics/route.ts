import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SnapshotRow = Record<string, any>;

function getDateKey(value: string | null | undefined) {
  if (!value) {
    return "unknown";
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getHealthStatus(snapshot: SnapshotRow) {
  return String(snapshot.health_status || snapshot.status || "unknown");
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
      .from("system_health_snapshots")
      .select("*")
      .gte("created_at", cutoff.toISOString())
      .order("created_at", {
        ascending: true,
      })
      .limit(5000);

    if (error) {
      throw error;
    }

    const snapshots = data ?? [];

    const dailyMap = snapshots.reduce<
      Record<
        string,
        {
          date: string;
          total_count: number;
          healthy_count: number;
          warning_count: number;
          error_count: number;
          unknown_count: number;
        }
      >
    >((summary, snapshot) => {
      const dateKey = getDateKey(snapshot.created_at);
      const status = getHealthStatus(snapshot);

      if (!summary[dateKey]) {
        summary[dateKey] = {
          date: dateKey,
          total_count: 0,
          healthy_count: 0,
          warning_count: 0,
          error_count: 0,
          unknown_count: 0,
        };
      }

      summary[dateKey].total_count += 1;

      if (status === "healthy") {
        summary[dateKey].healthy_count += 1;
      } else if (status === "warning") {
        summary[dateKey].warning_count += 1;
      } else if (status === "error") {
        summary[dateKey].error_count += 1;
      } else {
        summary[dateKey].unknown_count += 1;
      }

      return summary;
    }, {});

    const latestSnapshot = snapshots[snapshots.length - 1] ?? null;

    return NextResponse.json({
      summary: {
        days,
        total_count: snapshots.length,
        latest_snapshot_at: latestSnapshot?.created_at ?? null,
        latest_health_status: latestSnapshot
          ? getHealthStatus(latestSnapshot)
          : null,
        status_counts: countByKey(snapshots, getHealthStatus),
        snapshot_type_counts: countByKey(
          snapshots,
          (snapshot) => snapshot.snapshot_type
        ),
        daily: Object.values(dailyMap),
      },
      message: "System health snapshot analytics loaded.",
    });
  } catch (error) {
    console.error("SYSTEM HEALTH SNAPSHOT ANALYTICS ERROR:", error);

    return NextResponse.json(
      {
        error: "System health snapshot analytics could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}