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
    const ipAddress = (url.searchParams.get("ip") ?? "").trim();

    let query = supabaseAdmin
      .from("admin_ip_blocklist_events")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (ipAddress) {
      query = query.eq("ip_address", ipAddress);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      events: data ?? [],
      message: "Blocklist events loaded.",
    });
  } catch (error) {
    console.error("ADMIN IP BLOCKLIST EVENTS ERROR:", error);

    return NextResponse.json(
      {
        error: "Blocklist events could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}