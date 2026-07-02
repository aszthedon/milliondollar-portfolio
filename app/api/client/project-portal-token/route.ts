import crypto from "crypto";
import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function safeMaybeSingle({
  table,
  column,
  value,
}: {
  table: string;
  column: string;
  value: string | number;
}) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq(column, value)
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

async function safeRows({
  table,
  column,
  value,
}: {
  table: string;
  column: string;
  value: string | number;
}) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq(column, value)
    .order("created_at", {
      ascending: false,
    })
    .limit(500);

  if (error) {
    return [];
  }

  return data ?? [];
}

async function findClientByToken(token: string) {
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
    });

    if (client) {
      return client;
    }
  }

  return null;
}

async function findProjectByToken(token: string) {
  const tokenColumns = [
    "project_portal_token",
    "portal_token",
    "client_portal_token",
  ];

  for (const column of tokenColumns) {
    const project = await safeMaybeSingle({
      table: "media_projects",
      column,
      value: token,
    });

    if (project) {
      return project;
    }
  }

  return null;
}

async function findProjectsForClient(client: Record<string, unknown>) {
  const projects: Record<string, unknown>[] = [];
  const seenIds = new Set<string>();

  async function addRows(rows: Record<string, unknown>[]) {
    for (const row of rows) {
      const id = String(row.id ?? "");

      if (!id || seenIds.has(id)) {
        continue;
      }

      seenIds.add(id);
      projects.push(row);
    }
  }

  if (client.id) {
    await addRows(
      await safeRows({
        table: "media_projects",
        column: "client_id",
        value: Number(client.id),
      })
    );
  }

  const email = String(
    client.email || client.customer_email || client.client_email || ""
  ).trim();

  if (email) {
    await addRows(
      await safeRows({
        table: "media_projects",
        column: "client_email",
        value: email,
      })
    );
  }

  return projects;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = String(url.searchParams.get("token") ?? "").trim();

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

    const client = await findClientByToken(token);

    if (client) {
      const projects = await findProjectsForClient(client);

      return NextResponse.json({
        client,
        projects,
        message: "Project portal loaded.",
      });
    }

    const project = await findProjectByToken(token);

    if (!project) {
      return NextResponse.json(
        {
          error: "Project portal token was not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      client: null,
      projects: [project],
      message: "Project portal loaded.",
    });
  } catch (error) {
    console.error("LOAD PROJECT PORTAL TOKEN ERROR:", error);

    return NextResponse.json(
      {
        error: "Project portal could not be loaded.",
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

    if (!Number.isFinite(clientId)) {
      return NextResponse.json(
        {
          error: "A valid client ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const token = String(body.token ?? createToken()).trim();

    const { data, error } = await supabaseAdmin
      .from("crm_clients")
      .update({
        project_portal_token: token,
        portal_token: token,
        client_portal_token: token,
        project_portal_token_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .select("*")
      .maybeSingle();

    if (error) {
      const fallback = await supabaseAdmin
        .from("crm_clients")
        .update({
          project_portal_token: token,
        })
        .eq("id", clientId)
        .select("*")
        .maybeSingle();

      if (fallback.error) {
        throw fallback.error;
      }

      return NextResponse.json({
        client: fallback.data,
        token,
        message: "Project portal token created.",
      });
    }

    return NextResponse.json({
      client: data,
      token,
      message: "Project portal token created.",
    });
  } catch (error) {
    console.error("CREATE PROJECT PORTAL TOKEN ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Project portal token could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}