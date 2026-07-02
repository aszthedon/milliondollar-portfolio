import crypto from "crypto";
import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getSiteUrl(request: Request) {
  const fallbackUrl = new URL(request.url);

  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${fallbackUrl.protocol}//${fallbackUrl.host}`
  ).replace(/\/$/, "");
}

function getClientName(client: Record<string, unknown>) {
  return String(
    client.full_name ||
      client.name ||
      client.client_name ||
      client.customer_name ||
      client.email ||
      `Client #${client.id}`
  );
}

function getClientEmail(client: Record<string, unknown>) {
  return String(
    client.email ||
      client.customer_email ||
      client.client_email ||
      ""
  ).trim();
}

function getTemplateName(template: Record<string, unknown>) {
  return String(
    template.template_name ||
      template.title ||
      template.name ||
      `Template #${template.id}`
  );
}

function getTemplateBody(template: Record<string, unknown>) {
  return String(
    template.contract_body ||
      template.body ||
      template.content ||
      template.template_body ||
      ""
  );
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const clientId = Number(body.client_id ?? body.clientId);
    const templateId = Number(body.template_id ?? body.templateId);
    const contractTitle = String(body.contract_title ?? body.title ?? "").trim();

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

    if (!Number.isFinite(templateId)) {
      return NextResponse.json(
        {
          error: "A valid contract template ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const [clientResult, templateResult] = await Promise.all([
      supabaseAdmin.from("crm_clients").select("*").eq("id", clientId).maybeSingle(),
      supabaseAdmin
        .from("contract_templates")
        .select("*")
        .eq("id", templateId)
        .maybeSingle(),
    ]);

    if (clientResult.error) {
      throw clientResult.error;
    }

    if (templateResult.error) {
      throw templateResult.error;
    }

    if (!clientResult.data) {
      return NextResponse.json(
        {
          error: "Client was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!templateResult.data) {
      return NextResponse.json(
        {
          error: "Contract template was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const client = clientResult.data;
    const template = templateResult.data;
    const signingToken = crypto.randomBytes(32).toString("hex");
    const siteUrl = getSiteUrl(request);
    const signingUrl = `${siteUrl}/contracts/sign?token=${signingToken}`;

    const insertPayload = {
      client_id: clientId,
      template_id: templateId,
      contract_title:
        contractTitle || `${getTemplateName(template)} - ${getClientName(client)}`,
      template_name: getTemplateName(template),
      client_name: getClientName(client),
      client_email: getClientEmail(client),
      signer_name: getClientName(client),
      signer_email: getClientEmail(client),
      contract_body: getTemplateBody(template),
      contract_status: "sent",
      status: "sent",
      signing_token: signingToken,
      signing_url: signingUrl,
      sent_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("client_contracts")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      contract: data,
      signing_url: signingUrl,
      message: "Contract created.",
    });
  } catch (error) {
    console.error("CREATE CONTRACT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Contract could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}