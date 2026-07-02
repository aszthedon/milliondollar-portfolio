import crypto from "crypto";
import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getClientId(body: Record<string, unknown>) {
  return Number(body.client_id ?? body.clientId ?? body.id);
}

async function updateClientToken(clientId: number, token: string) {
  const richUpdate = {
    project_portal_token: token,
    portal_token: token,
    client_portal_token: token,
    project_portal_token_created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("crm_clients")
    .update(richUpdate)
    .eq("id", clientId)
    .select("*")
    .maybeSingle();

  if (!error) {
    return data;
  }

  const fallbackColumns = [
    "project_portal_token",
    "portal_token",
    "client_portal_token",
  ];

  for (const column of fallbackColumns) {
    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from("crm_clients")
      .update({
        [column]: token,
      })
      .eq("id", clientId)
      .select("*")
      .maybeSingle();

    if (!fallbackError) {
      return fallbackData;
    }
  }

  throw error;
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const clientId = getClientId(body);

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

    const { data: existingClient, error: existingError } = await supabaseAdmin
      .from("crm_clients")
      .select("*")
      .eq("id", clientId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingClient) {
      return NextResponse.json(
        {
          error: "Client was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const token = createToken();
    const client = await updateClientToken(clientId, token);

    return NextResponse.json({
      client,
      token,
      message: "Project portal token regenerated.",
    });
  } catch (error) {
    console.error("REGENERATE PROJECT PORTAL TOKEN ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Project portal token could not be regenerated.",
      },
      {
        status: 500,
      }
    );
  }
}