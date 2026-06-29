import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";

    const signerName =
      typeof body.signer_name === "string"
        ? body.signer_name.trim()
        : "";

    const signerEmail =
      typeof body.signer_email === "string"
        ? body.signer_email.trim().toLowerCase()
        : "";

    const signatureText =
      typeof body.signature_text === "string"
        ? body.signature_text.trim()
        : "";

    const agreed = Boolean(body.agreed);

    if (
      !token ||
      !signerName ||
      !signerEmail ||
      !signatureText ||
      !agreed
    ) {
      return NextResponse.json(
        {
          error:
            "Name, email, signature, and agreement confirmation are required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: contract, error: contractError } =
      await supabaseAdmin
        .from("client_contracts")
        .select("*")
        .eq("signing_token", token)
        .maybeSingle();

    if (contractError || !contract) {
      console.error("CONTRACT SIGN LOOKUP ERROR:", contractError);

      return NextResponse.json(
        {
          error: "Contract could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    if (contract.status === "signed") {
      return NextResponse.json(
        {
          error: "This contract has already been signed.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      contract.status === "void" ||
      contract.status === "cancelled"
    ) {
      return NextResponse.json(
        {
          error: "This contract is no longer active.",
        },
        {
          status: 400,
        }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const userAgent =
      request.headers.get("user-agent") ??
      "unknown";

    const { error: updateError } =
      await supabaseAdmin
        .from("client_contracts")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          signer_name: signerName,
          signer_email: signerEmail,
          signature_text: signatureText,
          signature_ip: ipAddress,
          signature_user_agent: userAgent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

    if (updateError) {
      console.error("CONTRACT SIGN UPDATE ERROR:", updateError);

      return NextResponse.json(
        {
          error: "Contract could not be signed.",
        },
        {
          status: 500,
        }
      );
    }

    if (contract.crm_client_id) {
      await supabaseAdmin
        .from("crm_clients")
        .update({
          status: "active",
          last_contacted_at: new Date().toISOString(),
        })
        .eq("id", contract.crm_client_id);
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("CONTRACT SIGN ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: "Contract could not be signed.",
      },
      {
        status: 500,
      }
    );
  }
}