import { NextResponse } from "next/server";

import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getClientIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

async function safeMaybeSingle({
  table,
  column,
  value,
  siteSlug,
}: {
  table: string;
  column: string;
  value: string | number;
  siteSlug: string;
}) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("site_slug", siteSlug)
    .eq(column, value)
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

async function findPortalRecord(token: string, siteSlug: string) {
  const tokenColumns = [
    "project_portal_token",
    "portal_token",
    "client_portal_token",
  ];

  for (const column of tokenColumns) {
    const client = await safeMaybeSingle({
      table: "crm_clients",
      column,
      value: token,
      siteSlug,
    });

    if (client) {
      return {
        client,
        project: null,
      };
    }
  }

  for (const column of tokenColumns) {
    const project = await safeMaybeSingle({
      table: "media_projects",
      column,
      value: token,
      siteSlug,
    });

    if (project) {
      return {
        client: null,
        project,
      };
    }
  }

  return {
    client: null,
    project: null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const siteSlug = getServerSiteSlug();
    const token = String(body.token ?? "").trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "Project portal token is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { client, project } = await findPortalRecord(token, siteSlug);
    const accessedAt = new Date().toISOString();

    const accessPayload = {
      site_slug: siteSlug,
      token,
      client_id: client?.id ?? project?.client_id ?? null,
      project_id: project?.id ?? null,
      ip_address: getClientIpAddress(request),
      user_agent: request.headers.get("user-agent") ?? "unknown",
      accessed_at: accessedAt,
      created_at: accessedAt,
    };

    const { data: accessLog, error } = await supabaseAdmin
      .from("project_portal_access_logs")
      .insert(accessPayload)
      .select("*")
      .single();

    if (error) {
      await Promise.all([
        client?.id
          ? supabaseAdmin
              .from("crm_clients")
              .update({
                latest_project_portal_access_at: accessedAt,
                updated_at: accessedAt,
              })
              .eq("site_slug", siteSlug)
              .eq("id", client.id)
          : Promise.resolve(null),
        project?.id
          ? supabaseAdmin
              .from("media_projects")
              .update({
                latest_project_portal_access_at: accessedAt,
                updated_at: accessedAt,
              })
              .eq("site_slug", siteSlug)
              .eq("id", project.id)
          : Promise.resolve(null),
      ]).catch(() => null);

      return NextResponse.json({
        access_log: null,
        message: "Project portal access logged.",
      });
    }

    return NextResponse.json({
      access_log: accessLog,
      message: "Project portal access logged.",
    });
  } catch (error) {
    console.error("LOG PROJECT PORTAL ACCESS ERROR:", error);

    return NextResponse.json(
      {
        error: "Project portal access could not be logged.",
      },
      {
        status: 500,
      }
    );
  }
}
