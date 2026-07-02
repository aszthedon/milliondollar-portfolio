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

    const { data: oldSnapshots, error: oldSnapshotsError } =
      await supabaseAdmin
        .from("system_health_snapshots")
        .select("id")
        .lt("created_at", cutoffDate)
        .limit(5000);

    if (oldSnapshotsError) {
      throw oldSnapshotsError;
    }

    const ids = (oldSnapshots ?? []).map((snapshot) => snapshot.id);

    if (ids.length === 0) {
      return NextResponse.json({
        deleted_count: 0,
        cutoff_date: cutoffDate,
        message: "No old system health snapshots found.",
      });
    }

    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("system_health_snapshots")
      .delete()
      .in("id", ids)
      .select("id");

    if (deleteError) {
      throw deleteError;
    }

    const deletedCount = deletedRows?.length ?? 0;

    return NextResponse.json({
      deleted_count: deletedCount,
      cutoff_date: cutoffDate,
      message: `${deletedCount} system health snapshot${
        deletedCount === 1 ? "" : "s"
      } deleted.`,
    });
  } catch (error) {
    console.error("CLEAR SYSTEM HEALTH SNAPSHOTS ERROR:", error);

    return NextResponse.json(
      {
        error: "System health snapshots could not be cleared.",
      },
      {
        status: 500,
      }
    );
  }
}