import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json();

    const snapshotId = Number(body.id);

    if (!Number.isFinite(snapshotId)) {
      return NextResponse.json(
        {
          error: "Snapshot ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("admin_security_snapshots")
      .delete()
      .eq("id", snapshotId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: "Admin security snapshot deleted.",
    });
  } catch (error) {
    console.error("DELETE ADMIN SECURITY SNAPSHOT ERROR:", error);

    return NextResponse.json(
      {
        error: "Admin security snapshot could not be deleted.",
      },
      {
        status: 500,
      }
    );
  }
}