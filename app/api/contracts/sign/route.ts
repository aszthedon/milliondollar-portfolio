import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

function getContractIdentifier(body: Record<string, unknown>, request: Request) {
  const url = new URL(request.url);

  return {
    contractId: Number(body.contract_id ?? body.contractId ?? body.id),
    token: String(
      body.token ?? body.signing_token ?? url.searchParams.get("token") ?? ""
    ).trim(),
  };
}

async function findContract({
  contractId,
  token,
}: {
  contractId: number;
  token: string;
}) {
  if (token) {
    const { data, error } = await supabaseAdmin
      .from("client_contracts")
      .select("*")
      .eq("signing_token", token)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  if (Number.isFinite(contractId)) {
    const { data, error } = await supabaseAdmin
      .from("client_contracts")
      .select("*")
      .eq("id", contractId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  return null;
}

async function signContractWithFallback({
  contractId,
  signerName,
  signerEmail,
  signatureText,
}: {
  contractId: number;
  signerName: string;
  signerEmail: string;
  signatureText: string;
}) {
  const signedAt = new Date().toISOString();

  const richUpdate = {
    contract_status: "signed",
    status: "signed",
    signer_name: signerName,
    signer_email: signerEmail,
    signature_text: signatureText,
    signed_at: signedAt,
    updated_at: signedAt,
  };

  const { data, error } = await supabaseAdmin
    .from("client_contracts")
    .update(richUpdate)
    .eq("id", contractId)
    .select("*")
    .maybeSingle();

  if (!error) {
    return data;
  }

  const { data: fallbackData, error: fallbackError } = await supabaseAdmin
    .from("client_contracts")
    .update({
      contract_status: "signed",
      signed_at: signedAt,
    })
    .eq("id", contractId)
    .select("*")
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  return fallbackData;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const { contractId, token } = getContractIdentifier(body, request);
    const signerName = String(body.signer_name ?? body.signerName ?? "").trim();
    const signerEmail = String(body.signer_email ?? body.signerEmail ?? "").trim();
    const signatureText = String(
      body.signature_text ?? body.signatureText ?? body.signature ?? signerName
    ).trim();

    if (!token && !Number.isFinite(contractId)) {
      return NextResponse.json(
        {
          error: "A contract token or contract ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!signerName && !signatureText) {
      return NextResponse.json(
        {
          error: "A signer name or signature is required.",
        },
        {
          status: 400,
        }
      );
    }

    const contract = await findContract({
      contractId,
      token,
    });

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

    if (
      String(contract.contract_status ?? contract.status ?? "").toLowerCase() ===
      "signed"
    ) {
      return NextResponse.json({
        contract,
        message: "Contract was already signed.",
      });
    }

    const signedContract = await signContractWithFallback({
      contractId: Number(contract.id),
      signerName,
      signerEmail,
      signatureText,
    });

    return NextResponse.json({
      contract: signedContract,
      message: "Contract signed.",
    });
  } catch (error) {
    console.error("SIGN CONTRACT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Contract could not be signed.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = String(url.searchParams.get("token") ?? "").trim();

    if (!token) {
      return NextResponse.json(
        {
          error: "Contract token is required.",
        },
        {
          status: 400,
        }
      );
    }

    const contract = await findContract({
      contractId: Number.NaN,
      token,
    });

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

    return NextResponse.json({
      contract,
      message: "Contract loaded.",
    });
  } catch (error) {
    console.error("LOAD CONTRACT SIGNING ERROR:", error);

    return NextResponse.json(
      {
        error: "Contract could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}