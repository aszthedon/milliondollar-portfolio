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

function buildAddonPayload(body: Body) {
  const name = cleanText(body.name);
  if (!name) throw new Error("Add-on name is required.");

  return {
    name,
    description: cleanText(body.description),
    price: cleanNumber(body.price),
    duration: cleanNumber(body.duration),
    payment_mode: cleanText(body.payment_mode) || null,
    deposit_type: cleanText(body.deposit_type) || null,
    deposit_value: body.deposit_value === null || body.deposit_value === "" ? null : cleanNumber(body.deposit_value),
    is_active: cleanBoolean(body.is_active, true),
    sort_order: cleanNumber(body.sort_order, 100),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const [{ data: addons, error: addonsError }, { data: assignments, error: assignmentsError }] = await Promise.all([
      supabaseAdmin
        .from("service_addons")
        .select("*")
        .eq("site_slug", siteSlug)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("service_addon_assignments")
        .select("*")
        .eq("site_slug", siteSlug),
    ]);

    if (addonsError) throw addonsError;
    if (assignmentsError) throw assignmentsError;

    return NextResponse.json({ site_slug: siteSlug, addons: addons ?? [], assignments: assignments ?? [] });
  } catch (error) {
    console.error("LOAD SERVICE ADDONS ERROR:", error);
    return NextResponse.json({ error: "Service add-ons could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildAddonPayload(body);

    const { data, error } = await supabaseAdmin
      .from("service_addons")
      .insert({ site_slug: siteSlug, ...payload })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, addon: data, message: "Add-on created." });
  } catch (error) {
    console.error("CREATE SERVICE ADDON ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Add-on could not be created." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const addonId = cleanNumber(body.id);
    if (!addonId) return NextResponse.json({ error: "Add-on ID is required." }, { status: 400 });

    const payload = buildAddonPayload(body);
    const { data, error } = await supabaseAdmin
      .from("service_addons")
      .update(payload)
      .eq("site_slug", siteSlug)
      .eq("id", addonId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, addon: data, message: "Add-on saved." });
  } catch (error) {
    console.error("SAVE SERVICE ADDON ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Add-on could not be saved." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const serviceId = cleanNumber(body.service_id);
    const addonId = cleanNumber(body.addon_id);
    const isEnabled = cleanBoolean(body.is_enabled, true);

    if (!serviceId || !addonId) {
      return NextResponse.json({ error: "Service and add-on are required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("service_addon_assignments")
      .upsert(
        { site_slug: siteSlug, service_id: serviceId, addon_id: addonId, is_enabled: isEnabled, updated_at: new Date().toISOString() },
        { onConflict: "site_slug,service_id,addon_id" }
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, assignment: data, message: "Add-on assignment saved." });
  } catch (error) {
    console.error("SAVE ADDON ASSIGNMENT ERROR:", error);
    return NextResponse.json({ error: "Add-on assignment could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const id = cleanNumber(new URL(request.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Add-on ID is required." }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("service_addons")
      .delete()
      .eq("site_slug", siteSlug)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, message: "Add-on deleted." });
  } catch (error) {
    console.error("DELETE SERVICE ADDON ERROR:", error);
    return NextResponse.json({ error: "Add-on could not be deleted." }, { status: 500 });
  }
}
