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

    const rawLimit = Number(url.searchParams.get("limit") ?? 50);
    const rawOffset = Number(url.searchParams.get("offset") ?? 0);
    const active = String(url.searchParams.get("active") ?? "all").trim();
    const search = String(url.searchParams.get("search") ?? "").trim();

    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;

    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    let query = supabaseAdmin
      .from("admin_ip_blocklist")
      .select("*", {
        count: "exact",
      })
      .order("created_at", {
        ascending: false,
      });

    if (active === "true") {
      query = query.eq("is_active", true);
    }

    if (active === "false") {
      query = query.eq("is_active", false);
    }

    if (search) {
      query = query.or(
        [`ip_address.ilike.%${search}%`, `reason.ilike.%${search}%`].join(",")
      );
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      throw error;
    }

    const blocklist = data ?? [];

    const summary = {
      total_count: count ?? 0,
      loaded_count: blocklist.length,
      active_loaded_count: blocklist.filter((item) => item.is_active).length,
      inactive_loaded_count: blocklist.filter((item) => !item.is_active).length,
      latest_created_at: blocklist[0]?.created_at ?? null,
    };

    return NextResponse.json({
      blocklist,
      summary,
      count: count ?? 0,
      has_more: offset + limit < (count ?? 0),
      next_offset: offset + limit,
      message: "Admin IP blocklist loaded.",
    });
  } catch (error) {
    console.error("ADMIN IP BLOCKLIST ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin IP blocklist could not be loaded.",
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

    const ipAddress = String(body.ip_address ?? "").trim();
    const reason = String(body.reason ?? "Manual dashboard block.").trim();

    if (!ipAddress) {
      return NextResponse.json(
        {
          error: "IP address is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("admin_ip_blocklist")
      .insert({
        ip_address: ipAddress,
        reason,
        is_active: body.is_active !== false,
        expires_at: body.expires_at ? String(body.expires_at) : null,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      block: data,
      message: "IP address added to blocklist.",
    });
  } catch (error) {
    console.error("CREATE ADMIN IP BLOCK ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "IP address could not be blocked.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!Number.isFinite(id)) {
      return NextResponse.json(
        {
          error: "Blocklist ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const updates: Record<string, unknown> = {};

    if (body.reason !== undefined) {
      updates.reason = String(body.reason);
    }

    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active);
    }

    if (body.expires_at !== undefined) {
      updates.expires_at = body.expires_at ? String(body.expires_at) : null;
    }

    const { data, error } = await supabaseAdmin
      .from("admin_ip_blocklist")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      block: data,
      message: "IP blocklist record updated.",
    });
  } catch (error) {
    console.error("UPDATE ADMIN IP BLOCK ERROR:", error);

    return NextResponse.json(
      {
        error: "IP blocklist record could not be updated.",
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
          error: "Blocklist ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("admin_ip_blocklist")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "IP blocklist record deleted.",
    });
  } catch (error) {
    console.error("DELETE ADMIN IP BLOCK ERROR:", error);

    return NextResponse.json(
      {
        error: "IP blocklist record could not be deleted.",
      },
      {
        status: 500,
      }
    );
  }
}