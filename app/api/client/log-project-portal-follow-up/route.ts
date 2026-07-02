import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getClientId(body: Record<string, unknown>) {
  const value = Number(body.client_id ?? body.clientId);

  return Number.isFinite(value) ? value : null;
}

function getProjectId(body: Record<string, unknown>) {
  const value = Number(body.project_id ?? body.projectId);

  return Number.isFinite(value) ? value : null;
}

async function insertFollowUpLog(payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("project_portal_follow_ups")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return null;
  }

  return data;
}

async function updateClientFallback({
  clientId,
  note,
}: {
  clientId: number | null;
  note: string;
}) {
  if (!clientId) {
    return;
  }

  await supabaseAdmin
    .from("crm_clients")
    .update({
      latest_project_portal_follow_up_at: new Date().toISOString(),
      latest_project_portal_follow_up_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
}

async function updateProjectFallback({
  projectId,
  note,
}: {
  projectId: number | null;
  note: string;
}) {
  if (!projectId) {
    return;
  }

  await supabaseAdmin
    .from("media_projects")
    .update({
      latest_project_portal_follow_up_at: new Date().toISOString(),
      latest_project_portal_follow_up_note: note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const clientId = getClientId(body);
    const projectId = getProjectId(body);
    const note = String(
      body.note ?? body.follow_up_note ?? "Project portal follow-up logged."
    ).trim();

    if (!clientId && !projectId) {
      return NextResponse.json(
        {
          error: "A client ID or project ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const payload = {
      client_id: clientId,
      project_id: projectId,
      follow_up_type: String(body.follow_up_type ?? "manual").trim(),
      follow_up_status: String(body.follow_up_status ?? "completed").trim(),
      note,
      metadata: body.metadata ?? {},
      created_at: new Date().toISOString(),
    };

    const followUp = await insertFollowUpLog(payload);

    await updateClientFallback({
      clientId,
      note,
    }).catch(() => null);

    await updateProjectFallback({
      projectId,
      note,
    }).catch(() => null);

    return NextResponse.json({
      follow_up: followUp,
      message: "Project portal follow-up logged.",
    });
  } catch (error) {
    console.error("LOG PROJECT PORTAL FOLLOW-UP ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Project portal follow-up could not be logged.",
      },
      {
        status: 500,
      }
    );
  }
}