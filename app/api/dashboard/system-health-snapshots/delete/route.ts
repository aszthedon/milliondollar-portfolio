import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);

    if (!Number.isFinite(id)) {
      return NextResponse.json(
        {
          error: "System health snapshot ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("system_health_snapshots")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "System health snapshot deleted.",
    });
  } catch (error) {
    console.error("DELETE SYSTEM HEALTH SNAPSHOT ERROR:", error);

    return NextResponse.json(
      {
        error: "System health snapshot could not be deleted.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: Request) {
  return POST(request);
}