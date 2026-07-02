import { NextResponse } from "next/server";

import { logCronRun } from "@/lib/logCronRun";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization");

  if (authorization === `Bearer ${cronSecret}`) {
    return true;
  }

  const url = new URL(request.url);

  return url.searchParams.get("secret") === cronSecret;
}

function getCronTriggerSource(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    return "vercel_scheduled";
  }

  const url = new URL(request.url);

  if (url.searchParams.get("secret")) {
    return "manual_secret_url";
  }

  return "unknown";
}

function getCutoffDate(days: number) {
  const cutoff = new Date();

  cutoff.setDate(cutoff.getDate() - days);

  return cutoff.toISOString();
}

function getClientEmail(project: Record<string, unknown>) {
  return String(
    project.client_email ||
      project.customer_email ||
      project.email ||
      ""
  ).trim();
}

async function insertFollowUp(project: Record<string, unknown>) {
  const note = `Automatic project portal follow-up queued for ${
    project.project_title || project.title || `Project #${project.id}`
  }.`;

  const { data, error } = await supabaseAdmin
    .from("project_portal_follow_ups")
    .insert({
      project_id: project.id ?? null,
      client_id: project.client_id ?? null,
      follow_up_type: "automatic",
      follow_up_status: getClientEmail(project) ? "queued" : "missing_email",
      note,
      metadata: {
        project_title: project.project_title || project.title || null,
        client_email: getClientEmail(project) || null,
      },
      created_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return null;
  }

  return data;
}

async function updateProjectFollowUp(projectId: number) {
  await supabaseAdmin
    .from("media_projects")
    .update({
      latest_project_portal_follow_up_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized cron request.",
      },
      {
        status: 401,
      }
    );
  }

  const triggerSource = getCronTriggerSource(request);

  try {
    const url = new URL(request.url);
    const rawDays = Number(url.searchParams.get("days") ?? 3);

    const days =
      Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 30) : 3;

    const cutoffDate = getCutoffDate(days);

    const { data: projects, error } = await supabaseAdmin
      .from("media_projects")
      .select("*")
      .in("project_status", ["active", "in_progress", "review"])
      .lt("updated_at", cutoffDate)
      .order("updated_at", {
        ascending: true,
      })
      .limit(100);

    if (error) {
      const fallback = await supabaseAdmin
        .from("media_projects")
        .select("*")
        .order("created_at", {
          ascending: true,
        })
        .limit(100);

      if (fallback.error) {
        throw fallback.error;
      }

      const fallbackProjects = fallback.data ?? [];

      await logCronRun({
        cronName: "project_portal_follow_ups",
        triggerSource,
        status: "success",
        message: "Project portal follow-up scan completed with fallback query.",
        resultSummary: {
          scanned_count: fallbackProjects.length,
          queued_count: 0,
          fallback: true,
        },
      });

      return NextResponse.json({
        checked_at: new Date().toISOString(),
        scanned_count: fallbackProjects.length,
        queued_count: 0,
        message: "Project portal follow-up scan completed with fallback query.",
      });
    }

    const staleProjects = projects ?? [];
    let queuedCount = 0;

    for (const project of staleProjects) {
      const followUp = await insertFollowUp(project);

      if (followUp) {
        queuedCount += 1;
      }

      if (project.id) {
        await updateProjectFollowUp(Number(project.id)).catch(() => null);
      }
    }

    await logCronRun({
      cronName: "project_portal_follow_ups",
      triggerSource,
      status: "success",
      message: `${queuedCount} project portal follow-up${
        queuedCount === 1 ? "" : "s"
      } queued.`,
      resultSummary: {
        scanned_count: staleProjects.length,
        queued_count: queuedCount,
        cutoff_date: cutoffDate,
      },
    });

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      cutoff_date: cutoffDate,
      scanned_count: staleProjects.length,
      queued_count: queuedCount,
      message: `${queuedCount} project portal follow-up${
        queuedCount === 1 ? "" : "s"
      } queued.`,
    });
  } catch (error) {
    console.error("PROJECT PORTAL FOLLOW-UPS CRON ERROR:", error);

    await logCronRun({
      cronName: "project_portal_follow_ups",
      triggerSource,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected project portal follow-up cron error.",
      resultSummary: {},
    });

    return NextResponse.json(
      {
        error: "Unexpected error running project portal follow-ups.",
      },
      {
        status: 500,
      }
    );
  }
}