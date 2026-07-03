import crypto from "crypto";
import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hasPortalToken(client: Record<string, unknown>) {
  return Boolean(
    client.project_portal_token ||
      client.portal_token ||
      client.client_portal_token
  );
}

async function updateClientToken({
  clientId,
  token,
  siteSlug,
}: {
  clientId: number;
  token: string;
  siteSlug: string;
}) {
  const richUpdate = {
    project_portal_token: token,
    portal_token: token,
    client_portal_token: token,
    project_portal_token_created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("crm_clients")
    .update(richUpdate)
    .eq("site_slug", siteSlug)
    .eq("id", clientId);

  if (!error) {
    return true;
  }

  const fallbackColumns = [
    "project_portal_token",
    "portal_token",
    "client_portal_token",
  ];

  for (const column of fallbackColumns) {
    const { error: fallbackError } = await supabaseAdmin
      .from("crm_clients")
      .update({
        [column]: token,
      })
      .eq("site_slug", siteSlug)
      .eq("id", clientId);

    if (!fallbackError) {
      return true;
    }
  }

  return false;
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const siteSlug = getServerSiteSlug();

    const { data: clients, error } = await supabaseAdmin
      .from("crm_clients")
      .select("*")
      .eq("site_slug", siteSlug)
      .order("created_at", {
        ascending: false,
      })
      .limit(5000);

    if (error) {
      throw error;
    }

    let generatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const client of clients ?? []) {
      if (hasPortalToken(client)) {
        skippedCount += 1;
        continue;
      }

      const token = createToken();
      const updated = await updateClientToken({
        clientId: Number(client.id),
        token,
        siteSlug,
      });

      if (updated) {
        generatedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    return NextResponse.json({
      generated_count: generatedCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
      message: `${generatedCount} project portal token${
        generatedCount === 1 ? "" : "s"
      } generated.`,
    });
  } catch (error) {
    console.error("BULK GENERATE PROJECT PORTAL TOKENS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Project portal tokens could not be generated.",
      },
      {
        status: 500,
      }
    );
  }
}
