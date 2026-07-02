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

function getNumberOrNull(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function getClientName(client: Record<string, unknown>) {
  return String(
    client.full_name ||
      client.name ||
      client.client_name ||
      client.customer_name ||
      client.email ||
      client.customer_email ||
      client.client_email ||
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

async function findAnyInvoiceId() {
  const { data, error } = await supabaseAdmin
    .from("admin_invoices")
    .select("id")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data.id;
}

async function insertContractWithFallback({
  basePayload,
  clientId,
  templateId,
  fallbackInvoiceId,
}: {
  basePayload: Record<string, unknown>;
  clientId: string;
  templateId: string;
  fallbackInvoiceId: unknown;
}) {
  const numericClientId = getNumberOrNull(clientId);
  const numericTemplateId = getNumberOrNull(templateId);

  const attempts: Record<string, unknown>[] = [
    {
      ...basePayload,
      client_id: clientId,
      template_id: templateId,
      invoice_id: fallbackInvoiceId,
    },
    {
      ...basePayload,
      client_id: numericClientId,
      template_id: numericTemplateId,
      invoice_id: fallbackInvoiceId,
    },
    {
      ...basePayload,
      client_id: numericClientId,
      template_id: numericTemplateId,
    },
    {
      ...basePayload,
      invoice_id: fallbackInvoiceId,
    },
    {
      ...basePayload,
    },
  ];

  const errors: string[] = [];

  for (const payload of attempts) {
    const { data, error } = await supabaseAdmin
      .from("client_contracts")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      return data;
    }

    errors.push(error.message);
  }

  throw new Error(errors.join(" | "));
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

    const [client, template, fallbackInvoiceId] = await Promise.all([
      findRecordById("crm_clients", clientId),
      findRecordById("contract_templates", templateId),
      findAnyInvoiceId(),
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
    const defaultTitle =
      contractTitle || `${getTemplateName(template)} - ${getClientName(client)}`;

    const now = new Date().toISOString();

  const contractContent =
    getTemplateBody(template) ||
    "This agreement confirms the production services, deliverables, payment expectations, and client approval process for Million Dollar Ticket Productions.";

  const basePayload = {
    contract_title: defaultTitle,
    title: defaultTitle,
    template_name: getTemplateName(template),
    client_name: getClientName(client),
    client_email: getClientEmail(client),
    signer_name: getClientName(client),
    signer_email: getClientEmail(client),
    contract_body: contractContent,
   content: contractContent,
    contract_status: "sent",
    status: "sent",
    signing_token: signingToken,
    signing_url: signingUrl,
    sent_at: now,
    created_at: now,
    updated_at: now,
  };

    const contract = await insertContractWithFallback({
      basePayload,
      clientId,
      templateId,
      fallbackInvoiceId,
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
          error instanceof Error
            ? error.message
            : "Contract could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}