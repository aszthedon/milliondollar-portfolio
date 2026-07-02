import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;

function safeNumber(value: string | null, fallback: number) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function cleanSearch(value: string) {
  return value.replace(/[,%]/g, "").trim();
}

function getProjectStatus(project: Row) {
  return String(project.project_status || project.status || "").toLowerCase();
}

function isActiveProject(project: Row) {
  return ["active", "in_progress", "review"].includes(getProjectStatus(project));
}

function isStaleProject(project: Row, days: number) {
  const updatedAt = project.updated_at || project.created_at;

  if (!updatedAt) {
    return true;
  }

  const date = new Date(String(updatedAt));

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  const cutoff = new Date();

  cutoff.setDate(cutoff.getDate() - days);

  return date < cutoff;
}

function getClientEmail(row: Row) {
  return String(
    row.client_email ||
      row.customer_email ||
      row.email ||
      ""
  ).trim();
}

async function getProjectsForSummary(days: number) {
  const { data, error } = await supabaseAdmin
    .from("media_projects")
    .select("*")
    .order("updated_at", {
      ascending: true,
    })
    .limit(500);

  if (error) {
    return [];
  }

  const projects = data ?? [];

  return projects.map((project) => ({
    ...project,
    is_active_project: isActiveProject(project),
    is_stale_project: isActiveProject(project) && isStaleProject(project, days),
    has_client_email: Boolean(getClientEmail(project)),
  }));
}

async function updateClientFollowUp(clientId: number | null, note: string) {
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

async function updateProjectFollowUp(projectId: number | null, note: string) {
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

    const status = String(url.searchParams.get("status") ?? "all").trim();
    const followUpType = String(
      url.searchParams.get("follow_up_type") ?? "all"
    ).trim();

    const search = cleanSearch(
      String(url.searchParams.get("search") ?? "")
    );

    const rawStaleDays = Number(url.searchParams.get("stale_days") ?? 3);

    const staleDays =
      Number.isFinite(rawStaleDays) && rawStaleDays > 0
        ? Math.min(rawStaleDays, 30)
        : 3;

    let query = supabaseAdmin
      .from("project_portal_follow_ups")
      .select("*", {
        count: "exact",
      })
      .order("created_at", {
        ascending: false,
      });

    if (status !== "all") {
      query = query.eq("follow_up_status", status);
    }

    if (followUpType !== "all") {
      query = query.eq("follow_up_type", followUpType);
    }

    if (search) {
      query = query.or(
        [
          `note.ilike.%${search}%`,
          `follow_up_type.ilike.%${search}%`,
          `follow_up_status.ilike.%${search}%`,
        ].join(",")
      );
    }

    const [{ data, error, count }, projects] = await Promise.all([
      query.range(offset, offset + limit - 1),
      getProjectsForSummary(staleDays),
    ]);

    if (error) {
      throw error;
    }

    const followUps = data ?? [];
    const activeProjects = projects.filter((project) => project.is_active_project);
    const staleProjects = projects.filter((project) => project.is_stale_project);
    const missingEmailProjects = activeProjects.filter(
      (project) => !project.has_client_email
    );

    return NextResponse.json({
      follow_ups: followUps,
      projects_summary: {
        active_project_count: activeProjects.length,
        stale_project_count: staleProjects.length,
        missing_project_email_count: missingEmailProjects.length,
        stale_days: staleDays,
      },
      stale_projects: staleProjects.slice(0, 50),
      summary: {
        total_count: count ?? 0,
        loaded_count: followUps.length,
        queued_loaded_count: followUps.filter(
          (followUp) => followUp.follow_up_status === "queued"
        ).length,
        completed_loaded_count: followUps.filter(
          (followUp) => followUp.follow_up_status === "completed"
        ).length,
        missing_email_loaded_count: followUps.filter(
          (followUp) => followUp.follow_up_status === "missing_email"
        ).length,
        latest_follow_up_at: followUps[0]?.created_at ?? null,
      },
      count: count ?? 0,
      has_more: offset + limit < (count ?? 0),
      next_offset: offset + limit,
      message: "Project portal follow-ups loaded.",
    });
  } catch (error) {
    console.error("PROJECT PORTAL FOLLOW-UPS DASHBOARD ERROR:", error);

    return NextResponse.json(
      {
        error: "Project portal follow-ups could not be loaded.",
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

    const clientId = Number(body.client_id ?? body.clientId);
    const projectId = Number(body.project_id ?? body.projectId);

    const safeClientId = Number.isFinite(clientId) ? clientId : null;
    const safeProjectId = Number.isFinite(projectId) ? projectId : null;

    const note = String(
      body.note ?? body.follow_up_note ?? "Project portal follow-up logged."
    ).trim();

    if (!safeClientId && !safeProjectId) {
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
      client_id: safeClientId,
      project_id: safeProjectId,
      follow_up_type: String(body.follow_up_type ?? "manual").trim(),
      follow_up_status: String(body.follow_up_status ?? "completed").trim(),
      note,
      metadata: body.metadata ?? {},
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("project_portal_follow_ups")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await updateClientFollowUp(safeClientId, note).catch(() => null);
    await updateProjectFollowUp(safeProjectId, note).catch(() => null);

    return NextResponse.json({
      follow_up: data,
      message: "Project portal follow-up logged.",
    });
  } catch (error) {
    console.error("CREATE DASHBOARD PROJECT PORTAL FOLLOW-UP ERROR:", error);

    return NextResponse.json(
      {
        error: "Project portal follow-up could not be logged.",
      },
      {
        status: 500,
      }
    );
  }
}