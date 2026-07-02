import crypto from "crypto";
import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getInvoiceId(body: Record<string, unknown>) {
  return Number(body.invoice_id ?? body.invoiceId ?? body.id);
}

function getProjectTitle(invoice: Record<string, unknown>) {
  return String(
    invoice.project_title ||
      invoice.title ||
      invoice.invoice_title ||
      invoice.invoice_number ||
      `Invoice Project #${invoice.id}`
  );
}

function getClientName(invoice: Record<string, unknown>) {
  return String(
    invoice.client_name ||
      invoice.customer_name ||
      invoice.name ||
      invoice.customer_email ||
      invoice.email ||
      "Invoice Client"
  );
}

function getClientEmail(invoice: Record<string, unknown>) {
  return String(
    invoice.customer_email ||
      invoice.client_email ||
      invoice.email ||
      ""
  ).trim();
}

async function updateInvoiceProjectId(invoiceId: number, projectId: number) {
  await supabaseAdmin
    .from("admin_invoices")
    .update({
      project_id: projectId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const invoiceId = getInvoiceId(body);

    if (!Number.isFinite(invoiceId)) {
      return NextResponse.json(
        {
          error: "A valid invoice ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("admin_invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError) {
      throw invoiceError;
    }

    if (!invoice) {
      return NextResponse.json(
        {
          error: "Invoice was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const portalToken = crypto.randomBytes(32).toString("hex");

    const insertPayload = {
      project_title: getProjectTitle(invoice),
      title: getProjectTitle(invoice),
      client_id: invoice.client_id ?? null,
      client_name: getClientName(invoice),
      client_email: getClientEmail(invoice),
      project_status: "active",
      status: "active",
      source_type: "invoice",
      source_id: invoiceId,
      invoice_id: invoiceId,
      project_portal_token: portalToken,
      description: String(invoice.notes ?? invoice.description ?? ""),
      due_date: invoice.due_date ?? null,
    };

    const { data: project, error: projectError } = await supabaseAdmin
      .from("media_projects")
      .insert(insertPayload)
      .select("*")
      .single();

    if (projectError) {
      throw projectError;
    }

    await updateInvoiceProjectId(invoiceId, project.id).catch(() => null);

    return NextResponse.json({
      project,
      message: "Project created from invoice.",
    });
  } catch (error) {
    console.error("CREATE PROJECT FROM INVOICE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Project could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}