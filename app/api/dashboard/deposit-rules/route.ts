import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function cleanNumber(value: unknown, fallback = 0) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? number : fallback;
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function buildPayload(body: Body) {
  const name = cleanText(body.name);

  if (!name) {
    throw new Error("Rule name is required.");
  }

  return {
    name,
    rule_scope: cleanText(body.rule_scope) || "site",
    service_id: cleanNumber(body.service_id) || null,
    service_variation_id: cleanNumber(body.service_variation_id) || null,
    client_email: cleanText(body.client_email).toLowerCase() || null,
    payment_mode: cleanText(body.payment_mode) || "deposit",
    deposit_type: cleanText(body.deposit_type) || "amount",
    deposit_value: cleanNumber(body.deposit_value),
    min_total: body.min_total === null || body.min_total === "" ? null : cleanNumber(body.min_total),
    max_total: body.max_total === null || body.max_total === "" ? null : cleanNumber(body.max_total),
    priority: cleanNumber(body.priority, 100),
    is_active: cleanBoolean(body.is_active, true),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const { data, error } = await supabaseAdmin
      .from("deposit_rules")
      .select("*")
      .eq("site_slug", siteSlug)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, rules: data ?? [] });
  } catch (error) {
    console.error("LOAD DEPOSIT RULES ERROR:", error);
    return NextResponse.json({ error: "Deposit rules could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildPayload(body);

    const { data, error } = await supabaseAdmin
      .from("deposit_rules")
      .insert({ site_slug: siteSlug, ...payload })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, rule: data, message: "Deposit rule created." });
  } catch (error) {
    console.error("CREATE DEPOSIT RULE ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Deposit rule could not be created." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const ruleId = cleanNumber(body.id);

    if (!ruleId) return NextResponse.json({ error: "Rule ID is required." }, { status: 400 });

    const payload = buildPayload(body);
    const { data, error } = await supabaseAdmin
      .from("deposit_rules")
      .update(payload)
      .eq("site_slug", siteSlug)
      .eq("id", ruleId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, rule: data, message: "Deposit rule saved." });
  } catch (error) {
    console.error("SAVE DEPOSIT RULE ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Deposit rule could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const id = cleanNumber(new URL(request.url).searchParams.get("id"));

    if (!id) return NextResponse.json({ error: "Rule ID is required." }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("deposit_rules")
      .delete()
      .eq("site_slug", siteSlug)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, message: "Deposit rule deleted." });
  } catch (error) {
    console.error("DELETE DEPOSIT RULE ERROR:", error);
    return NextResponse.json({ error: "Deposit rule could not be deleted." }, { status: 500 });
  }
}
