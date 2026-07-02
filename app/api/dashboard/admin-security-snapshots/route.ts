import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getSnapshotParams(request: Request) {
  const url = new URL(request.url);

  const rawLimit = Number(url.searchParams.get("limit") ?? 20);
  const rawOffset = Number(url.searchParams.get("offset") ?? 0);

  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  const offset =
    Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  return {
    limit,
    offset,
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { limit, offset } = getSnapshotParams(request);

    const { data, error, count } = await supabaseAdmin
      .from("admin_security_snapshots")
      .select("*", {
        count: "exact",
      })
      .order("created_at", {
        ascending: false,
      })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      snapshots: data ?? [],
      count: count ?? 0,
      limit,
      offset,
      has_more: offset + limit < (count ?? 0),
      next_offset: offset + limit,
      message: "Admin security snapshots loaded.",
    });
  } catch (error) {
    console.error("ADMIN SECURITY SNAPSHOTS LOAD ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin security snapshots could not be loaded.",
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
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("admin_security_snapshots")
      .insert({
        security_score: Number(body.security_score ?? 100),
        status: String(body.status ?? "Healthy"),
        failed_attempts: Number(body.failed_attempts ?? 0),
        locked_attempts: Number(body.locked_attempts ?? 0),
        active_blocked_ips: Number(body.active_blocked_ips ?? 0),
        suggested_blocks: Number(body.suggested_blocks ?? 0),
        suspicious_ips: Number(body.suspicious_ips ?? 0),
        failure_rate: Number(body.failure_rate ?? 0),
        report_text: body.report_text ? String(body.report_text) : null,
        trigger_source: String(body.trigger_source ?? "dashboard"),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      snapshot: data,
      message: "Admin security snapshot saved.",
    });
  } catch (error) {
    console.error("ADMIN SECURITY SNAPSHOT SAVE ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin security snapshot could not be saved.",
      },
      {
        status: 500,
      }
    );
  }
}