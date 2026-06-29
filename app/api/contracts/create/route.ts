import { NextResponse } from "next/server";
import crypto from "crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";

function getSiteUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function createSigningToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

async function upsertCrmClient({
  clientEmail,
  clientName,
}: {
  clientEmail: string;
  clientName: string;
}) {
  const cleanEmail = clientEmail.trim().toLowerCase();

  if (!cleanEmail) {
    return null;
  }

  const payload: Record<string, unknown> = {
    email: cleanEmail,
    source: "contract",
    last_contacted_at: new Date().toISOString(),
  };

  if (clientName.trim()) {
    payload.full_name = clientName.trim();
  }

  const { data, error } = await supabaseAdmin
    .from("crm_clients")
    .upsert(payload, {
      onConflict: "email",
    })
    .select("id")
    .single();

  if (error) {
    console.error("CRM CLIENT UPSERT ERROR:", error);
    return null;
  }

  return data?.id ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const clientName =
      typeof body.client_name === "string"
        ? body.client_name.trim()
        : "";

    const clientEmail =
      typeof body.client_email === "string"
        ? body.client_email.trim().toLowerCase()
        : "";

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim()
        : "";

    const dueDate =
      typeof body.due_date === "string" && body.due_date
        ? body.due_date
        : null;

    const projectValue = Math.max(
      Number(body.project_value ?? 0),
      0
    );

    const bookingId = body.booking_id
      ? Number(body.booking_id)
      : null;

    const invoiceId = body.invoice_id
      ? Number(body.invoice_id)
      : null;

    if (!clientEmail || !title || !content) {
      return NextResponse.json(
        {
          error:
            "Client email, contract title, and contract content are required.",
        },
        {
          status: 400,
        }
      );
    }

    const crmClientId = await upsertCrmClient({
      clientEmail,
      clientName,
    });

    const signingToken = createSigningToken();

    const { data: contract, error: contractError } =
      await supabaseAdmin
        .from("client_contracts")
        .insert({
          signing_token: signingToken,
          crm_client_id: crmClientId,
          booking_id: bookingId,
          invoice_id: invoiceId,
          client_name: clientName || null,
          client_email: clientEmail,
          title,
          content,
          project_value: projectValue,
          status: "sent",
          sent_at: new Date().toISOString(),
          due_date: dueDate,
          notes: notes || null,
        })
        .select()
        .single();

    if (contractError || !contract) {
      console.error("CONTRACT CREATE ERROR:", contractError);

      return NextResponse.json(
        {
          error: "Contract could not be created.",
        },
        {
          status: 500,
        }
      );
    }

    const siteUrl = getSiteUrl(request);
    const signingUrl = `${siteUrl}/contracts/${signingToken}`;

    return NextResponse.json({
      contract,
      signing_url: signingUrl,
    });
  } catch (error) {
    console.error("CONTRACT CREATE ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error: "Contract could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}