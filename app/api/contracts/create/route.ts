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

function getStringId(value: unknown) {
  return String(value ?? "").trim();
}

function getNumericIdOrNull(value: string) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
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

async function findRecordById(table: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function insertContractWithFallback({
  basePayload,
  clientId,
  templateId,
}: {
  basePayload: Record<string, unknown>;
  clientId: string;
  templateId: string;
}) {
  const insertAttempts = [
    {
      ...basePayload,
      client_id: clientId,
      template_id: templateId,
    },
    {
      ...basePayload,
      client_id: getNumericIdOrNull(clientId),
      template_id: getNumericIdOrNull(templateId),
    },
    {
      ...basePayload,
      client_id: null,
      template_id: getNumericIdOrNull(templateId),
    },
    {
      ...basePayload,
    },
  ];

  let lastError: unknown = null;

  for (const payload of insertAttempts) {
    const { data, error } = await supabaseAdmin
      .from("client_contracts")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      return data;
    }

    lastError = error;
  }

  throw lastError;
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const clientId = getStringId(body.client_id ?? body.clientId);
    const templateId = getStringId(body.template_id ?? body.templateId);
    const contractTitle = String(body.contract_title ?? body.title ?? "").trim();

    if (!clientId) {
      return NextResponse.json(
        {
          error: "A valid client ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!templateId) {
      return NextResponse.json(
        {
          error: "A valid contract template ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const [client, template] = await Promise.all([
      findRecordById("crm_clients", clientId),
      findRecordById("contract_templates", templateId),
    ]);

    if (!client) {
      return NextResponse.json(
        {
          error: "Client was not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!template) {
      return NextResponse.json(
        {
          error: "Contract template was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const signingToken = crypto.randomBytes(32).toString("hex");
    const siteUrl = getSiteUrl(request);
    const signingUrl = `${siteUrl}/contracts/${signingToken}`;

    const basePayload = {
      contract_title:
        contractTitle || `${getTemplateName(template)} - ${getClientName(client)}`,
      title:
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const contract = await insertContractWithFallback({
      basePayload,
      clientId,
      templateId,
    });

    return NextResponse.json({
      contract,
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