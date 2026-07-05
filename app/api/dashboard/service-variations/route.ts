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

async function serviceBelongsToSite(serviceId: number, siteSlug: string) {
  const { data, error } = await supabaseAdmin
    .from("services")
    .select("id")
    .eq("site_slug", siteSlug)
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
}

function buildVariationPayload(body: Body) {
  const serviceId = cleanNumber(body.service_id ?? body.serviceId);
  const variationName = cleanText(body.variation_name ?? body.variationName);
  const price = cleanNumber(body.price);
  const duration = cleanNumber(body.duration, 60);

  if (!serviceId || !variationName || price <= 0 || duration <= 0) {
    throw new Error("Service, variation name, price, and duration are required.");
  }

  return {
    service_id: serviceId,
    variation_name: variationName,
    price,
    duration,
    payment_mode: cleanText(body.payment_mode ?? body.paymentMode) || "deposit",
    deposit_type: cleanText(body.deposit_type ?? body.depositType) || "amount",
    deposit_value: cleanNumber(body.deposit_value ?? body.depositValue),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug();
    const url = new URL(request.url);
    const serviceId = cleanNumber(url.searchParams.get("service_id"));

    let query = supabaseAdmin
      .from("service_variations")
      .select("*")
      .eq("site_slug", siteSlug)
      .order("created_at", { ascending: false });

    if (serviceId) {
      query = query.eq("service_id", serviceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      site_slug: siteSlug,
      variations: data ?? [],
      message: "Service variations loaded.",
    });
  } catch (error) {
    console.error("LOAD SERVICE VARIATIONS ERROR:", error);
    return NextResponse.json({ error: "Service variations could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug();
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildVariationPayload(body);

    const allowed = await serviceBelongsToSite(payload.service_id, siteSlug);
    if (!allowed) {
      return NextResponse.json({ error: "Service does not belong to this site." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("service_variations")
      .insert({ site_slug: siteSlug, ...payload })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      site_slug: siteSlug,
      variation: data,
      message: "Service variation created.",
    });
  } catch (error) {
    console.error("CREATE SERVICE VARIATION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Service variation could not be created." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug();
    const body = (await request.json().catch(() => ({}))) as Body;
    const variationId = cleanNumber(body.id);
    const payload = buildVariationPayload(body);

    if (!variationId) {
      return NextResponse.json({ error: "Variation ID is required." }, { status: 400 });
    }

    const allowed = await serviceBelongsToSite(payload.service_id, siteSlug);
    if (!allowed) {
      return NextResponse.json({ error: "Service does not belong to this site." }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("service_variations")
      .update(payload)
      .eq("site_slug", siteSlug)
      .eq("id", variationId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      site_slug: siteSlug,
      variation: data,
      message: "Service variation saved.",
    });
  } catch (error) {
    console.error("SAVE SERVICE VARIATION ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Service variation could not be saved." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug();
    const url = new URL(request.url);
    const variationId = cleanNumber(url.searchParams.get("id"));

    if (!variationId) {
      return NextResponse.json({ error: "Variation ID is required." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("service_variations")
      .delete()
      .eq("site_slug", siteSlug)
      .eq("id", variationId);

    if (error) throw error;

    return NextResponse.json({
      site_slug: siteSlug,
      message: "Service variation deleted.",
    });
  } catch (error) {
    console.error("DELETE SERVICE VARIATION ERROR:", error);
    return NextResponse.json({ error: "Service variation could not be deleted." }, { status: 500 });
  }
}
