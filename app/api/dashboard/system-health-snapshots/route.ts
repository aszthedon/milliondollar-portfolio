import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function safeNumber(value: string | null, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function sanitizeFilter(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const url = new URL(request.url);

    const limit = Math.min(
      Math.max(safeNumber(url.searchParams.get("limit"), 25), 1),
      100
    );

    const offset = Math.max(safeNumber(url.searchParams.get("offset"), 0), 0);

    const status = sanitizeFilter(
      String(url.searchParams.get("status") ?? "all").trim()
    );

    const search = String(url.searchParams.get("search") ?? "").trim();

    let query = supabaseAdmin
      .from("system_health_snapshots")
      .select("*", {
        count: "exact",
      })
      .order("created_at", {
        ascending: false,
      });

    if (status && status !== "all") {
      query = query.or(`health_status.eq.${status},status.eq.${status}`);
    }

    if (search) {
      query = query.or(
        [
          `health_status.ilike.%${search}%`,
          `status.ilike.%${search}%`,
          `snapshot_type.ilike.%${search}%`,
          `message.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      throw error;
    }

    const snapshots = data ?? [];

    return NextResponse.json({
      snapshots,
      count: count ?? 0,
      has_more: offset + limit < (count ?? 0),
      next_offset: offset + limit,
      summary: {
        loaded_count: snapshots.length,
        total_count: count ?? 0,
        latest_snapshot_at: snapshots[0]?.created_at ?? null,
        healthy_loaded_count: snapshots.filter(
          (snapshot) =>
            snapshot.health_status === "healthy" || snapshot.status === "healthy"
        ).length,
        warning_loaded_count: snapshots.filter(
          (snapshot) =>
            snapshot.health_status === "warning" || snapshot.status === "warning"
        ).length,
        error_loaded_count: snapshots.filter(
          (snapshot) =>
            snapshot.health_status === "error" || snapshot.status === "error"
        ).length,
      },
      message: "System health snapshots loaded.",
    });
  } catch (error) {
    console.error("SYSTEM HEALTH SNAPSHOTS ERROR:", error);

    return NextResponse.json(
      {
        error: "System health snapshots could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const healthStatus = String(
      body.health_status ?? body.status ?? "healthy"
    ).trim();

    const insertPayload = {
      snapshot_type: String(body.snapshot_type ?? "manual").trim(),
      health_status: healthStatus,
      status: healthStatus,
      message: String(body.message ?? "Manual system health snapshot.").trim(),
      metrics: body.metrics ?? {},
      component_statuses: body.component_statuses ?? {},
      issues: Array.isArray(body.issues) ? body.issues : [],
      metadata: body.metadata ?? {},
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("system_health_snapshots")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      snapshot: data,
      message: "System health snapshot created.",
    });
  } catch (error) {
    console.error("CREATE SYSTEM HEALTH SNAPSHOT ERROR:", error);

    return NextResponse.json(
      {
        error: "System health snapshot could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}