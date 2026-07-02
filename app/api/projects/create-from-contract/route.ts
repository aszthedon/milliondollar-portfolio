import crypto from "crypto";
import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getContractId(body: Record<string, unknown>) {
  return Number(body.contract_id ?? body.contractId ?? body.id);
}

function getProjectTitle(contract: Record<string, unknown>) {
  return String(
    contract.project_title ||
      contract.contract_title ||
      contract.title ||
      contract.template_name ||
      `Contract Project #${contract.id}`
  );
}

function getClientName(contract: Record<string, unknown>) {
  return String(
    contract.client_name ||
      contract.signer_name ||
      contract.customer_name ||
      contract.client_email ||
      contract.signer_email ||
      "Contract Client"
  );
}

function getClientEmail(contract: Record<string, unknown>) {
  return String(
    contract.client_email ||
      contract.signer_email ||
      contract.customer_email ||
      ""
  ).trim();
}

async function updateContractProjectId(contractId: number, projectId: number) {
  await supabaseAdmin
    .from("client_contracts")
    .update({
      project_id: projectId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId);
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const contractId = getContractId(body);

    if (!Number.isFinite(contractId)) {
      return NextResponse.json(
        {
          error: "A valid contract ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: contract, error: contractError } = await supabaseAdmin
      .from("client_contracts")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();

    if (contractError) {
      throw contractError;
    }

    if (!contract) {
      return NextResponse.json(
        {
          error: "Contract was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const portalToken = crypto.randomBytes(32).toString("hex");

    const insertPayload = {
      project_title: getProjectTitle(contract),
      title: getProjectTitle(contract),
      client_id: contract.client_id ?? null,
      client_name: getClientName(contract),
      client_email: getClientEmail(contract),
      project_status: "active",
      status: "active",
      source_type: "contract",
      source_id: contractId,
      contract_id: contractId,
      project_portal_token: portalToken,
      description: String(contract.contract_body ?? contract.description ?? ""),
      due_date: null,
    };

    const { data: project, error: projectError } = await supabaseAdmin
      .from("media_projects")
      .insert(insertPayload)
      .select("*")
      .single();

    if (projectError) {
      throw projectError;
    }

    await updateContractProjectId(contractId, project.id).catch(() => null);

    return NextResponse.json({
      project,
      message: "Project created from contract.",
    });
  } catch (error) {
    console.error("CREATE PROJECT FROM CONTRACT ERROR:", error);

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