import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const url = new URL(request.url);

    const rawLimit = Number(url.searchParams.get("limit") ?? 25);
    const rawOffset = Number(url.searchParams.get("offset") ?? 0);
    const search = String(url.searchParams.get("search") ?? "").trim();
    const successFilter = String(url.searchParams.get("success") ?? "all").trim();

    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 25;

    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    let query = supabaseAdmin
      .from("admin_login_attempts")
      .select("*", {
        count: "exact",
      })
      .order("created_at", {
        ascending: false,
      });

    if (search) {
      query = query.or(
        [
          `ip_address.ilike.%${search}%`,
          `user_agent.ilike.%${search}%`,
          `reason.ilike.%${search}%`,
        ].join(",")
      );
    }

    if (successFilter === "true") {
      query = query.eq("success", true);
    }

    if (successFilter === "false") {
      query = query.eq("success", false);
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      throw error;
    }

    const attempts = data ?? [];

    const summary = {
      total_count: count ?? 0,
      loaded_count: attempts.length,
      successful_loaded_count: attempts.filter((attempt) => attempt.success)
        .length,
      failed_loaded_count: attempts.filter((attempt) => !attempt.success).length,
      latest_attempt_at: attempts[0]?.created_at ?? null,
    };

    return NextResponse.json({
      attempts,
      summary,
      count: count ?? 0,
      has_more: offset + limit < (count ?? 0),
      next_offset: offset + limit,
      message: "Admin login attempts loaded.",
    });
  } catch (error) {
    console.error("ADMIN LOGIN ATTEMPTS ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin login attempts could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error: "Login attempt ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("admin_login_attempts")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "Admin login attempt deleted.",
    });
  } catch (error) {
    console.error("DELETE ADMIN LOGIN ATTEMPT ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin login attempt could not be deleted.",
      },
      {
        status: 500,
      }
    );
  }
}