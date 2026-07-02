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
          error: "Cron run log ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("cron_run_logs")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "Cron run log deleted.",
    });
  } catch (error) {
    console.error("DELETE CRON RUN LOG ERROR:", error);

    return NextResponse.json(
      {
        error: "Cron run log could not be deleted.",
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