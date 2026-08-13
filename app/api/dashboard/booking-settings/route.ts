import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

function numberValue(value: unknown, fallback: number, min = 0) {
  const parsed = Number(value ?? fallback);
  return Math.max(min, Number.isFinite(parsed) ? Math.floor(parsed) : fallback);
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

const defaults = {
  booking_slot_interval_minutes: 30,
  booking_min_notice_hours: 0,
  booking_max_advance_days: 365,
  booking_buffer_before_minutes: 0,
  booking_buffer_after_minutes: 0,
  booking_allow_same_day: true,
  booking_auto_confirm: false,
};

function buildPayload(body: Body) {
  return {
    booking_slot_interval_minutes: numberValue(body.booking_slot_interval_minutes, 30, 5),
    booking_min_notice_hours: numberValue(body.booking_min_notice_hours, 0, 0),
    booking_max_advance_days: numberValue(body.booking_max_advance_days, 365, 1),
    booking_buffer_before_minutes: numberValue(body.booking_buffer_before_minutes, 0, 0),
    booking_buffer_after_minutes: numberValue(body.booking_buffer_after_minutes, 0, 0),
    booking_allow_same_day: booleanValue(body.booking_allow_same_day, true),
    booking_auto_confirm: booleanValue(body.booking_auto_confirm, false),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const siteSlug = getServerSiteSlug(request);
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("booking_slot_interval_minutes,booking_min_notice_hours,booking_max_advance_days,booking_buffer_before_minutes,booking_buffer_after_minutes,booking_allow_same_day,booking_auto_confirm")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, settings: { ...defaults, ...(data ?? {}) } });
  } catch (error) {
    console.error("LOAD BOOKING SETTINGS ERROR:", error);
    return NextResponse.json({ error: "Booking settings could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = requireAdminRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildPayload(body);
    const { data: existing } = await supabaseAdmin.from("site_settings").select("id").eq("site_slug", siteSlug).maybeSingle();
    const query = existing?.id
      ? supabaseAdmin.from("site_settings").update(payload).eq("site_slug", siteSlug).select("*").single()
      : supabaseAdmin.from("site_settings").insert({ site_slug: siteSlug, ...payload }).select("*").single();
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, settings: data, message: "Booking settings saved." });
  } catch (error) {
    console.error("SAVE BOOKING SETTINGS ERROR:", error);
    return NextResponse.json({ error: "Booking settings could not be saved." }, { status: 500 });
  }
}
