import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

function cleanText(value: unknown) { return String(value ?? "").trim(); }
function cleanNumber(value: unknown, fallback = 0) { const number = Number(value ?? fallback); return Number.isFinite(number) ? number : fallback; }
function cleanBoolean(value: unknown, fallback: boolean) { return typeof value === "boolean" ? value : fallback; }
function positiveInteger(value: unknown, fallback = 1) { return Math.max(1, Math.floor(cleanNumber(value, fallback))); }

function buildServicePayload(body: Body) {
  const title = cleanText(body.title);
  const price = cleanNumber(body.price);
  const duration = cleanNumber(body.duration, 60);
  const isRecurring = cleanBoolean(body.is_recurring ?? body.isRecurring, false);
  const allowQuantity = cleanBoolean(body.allow_quantity ?? body.allowQuantity, false);
  const minQuantity = positiveInteger(body.min_quantity ?? body.minQuantity, 1);
  const maxQuantity = allowQuantity ? Math.max(minQuantity, positiveInteger(body.max_quantity ?? body.maxQuantity, minQuantity)) : 1;
  const sectionId = cleanNumber(body.section_id ?? body.sectionId, 0);
  const imageUrl = cleanText(body.image_url ?? body.imageUrl);

  if (!title || price <= 0 || duration <= 0) throw new Error("Service title, price, and duration are required.");

  return {
    title,
    description: cleanText(body.description),
    price,
    duration,
    sort_order: cleanNumber(body.sort_order ?? body.sortOrder, 100),
    section_id: sectionId > 0 ? sectionId : null,
    payment_mode: cleanText(body.payment_mode || body.paymentMode) || "deposit",
    deposit_type: cleanText(body.deposit_type || body.depositType) || "amount",
    deposit_value: cleanNumber(body.deposit_value ?? body.depositValue),
    is_recurring: isRecurring,
    recurring_interval: isRecurring ? cleanText(body.recurring_interval ?? body.recurringInterval) || "weekly" : null,
    recurring_count: isRecurring ? cleanNumber(body.recurring_count ?? body.recurringCount, 4) : null,
    recurring_label: isRecurring ? cleanText(body.recurring_label ?? body.recurringLabel) || "Recurring service" : null,
    allow_quantity: allowQuantity,
    min_quantity: allowQuantity ? minQuantity : 1,
    max_quantity: maxQuantity,
    quantity_label: cleanText(body.quantity_label ?? body.quantityLabel) || "Quantity",
    image_url: imageUrl || null,
    image_alt_text: imageUrl ? cleanText(body.image_alt_text ?? body.imageAltText) || title : null,
    show_in_gallery: cleanBoolean(body.show_in_gallery ?? body.showInGallery, true),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;
  try {
    const siteSlug = getServerSiteSlug(request);
    const { data, error } = await supabaseAdmin.from("services").select("*").eq("site_slug", siteSlug).order("section_id", { ascending: true, nullsFirst: false }).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, services: data ?? [], message: "Services loaded." });
  } catch (error) {
    console.error("LOAD DASHBOARD SERVICES ERROR:", error);
    return NextResponse.json({ error: "Services could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;
  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildServicePayload(body);
    const { data, error } = await supabaseAdmin.from("services").insert({ site_slug: siteSlug, ...payload }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, service: data, message: "Service created." });
  } catch (error) {
    console.error("CREATE DASHBOARD SERVICE ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Service could not be created." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;
  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    if (Array.isArray(body.services)) {
      const saved = [];
      for (const item of body.services as Body[]) {
        const serviceId = cleanNumber(item.id);
        if (!serviceId) continue;
        const payload = buildServicePayload(item);
        const { data, error } = await supabaseAdmin.from("services").update(payload).eq("site_slug", siteSlug).eq("id", serviceId).select("*").single();
        if (error) throw error;
        saved.push(data);
      }
      return NextResponse.json({ site_slug: siteSlug, services: saved, message: "All services saved." });
    }

    const serviceId = cleanNumber(body.id);
    if (!serviceId) return NextResponse.json({ error: "Service ID is required." }, { status: 400 });
    const payload = buildServicePayload(body);
    const { data, error } = await supabaseAdmin.from("services").update(payload).eq("site_slug", siteSlug).eq("id", serviceId).select("*").single();
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, service: data, message: "Service saved." });
  } catch (error) {
    console.error("SAVE DASHBOARD SERVICE ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Service could not be saved." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;
  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const orderedIds = Array.isArray(body.ordered_ids) ? body.ordered_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0) : [];
    if (orderedIds.length === 0) return NextResponse.json({ error: "At least one service ID is required." }, { status: 400 });
    const { data: ownedServices, error: ownedError } = await supabaseAdmin.from("services").select("id").eq("site_slug", siteSlug).in("id", orderedIds);
    if (ownedError) throw ownedError;
    const ownedIds = new Set((ownedServices ?? []).map((service) => Number(service.id)));
    const invalidId = orderedIds.find((id) => !ownedIds.has(id));
    if (invalidId) return NextResponse.json({ error: "One service does not belong to this site." }, { status: 403 });
    for (const [index, id] of orderedIds.entries()) {
      const { error } = await supabaseAdmin.from("services").update({ sort_order: (index + 1) * 10 }).eq("site_slug", siteSlug).eq("id", id);
      if (error) throw error;
    }
    return NextResponse.json({ site_slug: siteSlug, message: "Service order saved." });
  } catch (error) {
    console.error("REORDER DASHBOARD SERVICES ERROR:", error);
    return NextResponse.json({ error: "Service order could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;
  try {
    const siteSlug = getServerSiteSlug(request);
    const id = cleanNumber(new URL(request.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Service ID is required." }, { status: 400 });
    const { error } = await supabaseAdmin.from("services").delete().eq("site_slug", siteSlug).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, message: "Service deleted." });
  } catch (error) {
    console.error("DELETE DASHBOARD SERVICE ERROR:", error);
    return NextResponse.json({ error: "Service could not be deleted." }, { status: 500 });
  }
}
