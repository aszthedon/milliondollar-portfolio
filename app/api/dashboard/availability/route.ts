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
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildPayload(body: Body) {
  const availableDate = cleanText(body.available_date);
  const startTime = cleanText(body.start_time || body.available_time);
  const endTime = cleanText(body.end_time);
  const timezone = cleanText(body.timezone) || "America/Detroit";

  if (!availableDate || !startTime || !endTime) {
    throw new Error("Date, start time, and end time are required.");
  }

  return {
    available_date: availableDate,
    available_time: startTime,
    start_time: startTime,
    end_time: endTime,
    timezone,
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const { data, error } = await supabaseAdmin
      .from("availability")
      .select("id,available_date,available_time,start_time,end_time,timezone,created_at")
      .eq("site_slug", siteSlug)
      .order("available_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, availability: data ?? [] });
  } catch (error) {
    console.error("LOAD AVAILABILITY ERROR:", error);
    return NextResponse.json({ error: "Availability could not be loaded." }, { status: 500 });
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
      .from("availability")
      .insert({ site_slug: siteSlug, ...payload })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, availability: data, message: "Availability added." });
  } catch (error) {
    console.error("CREATE AVAILABILITY ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Availability could not be added." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    if (Array.isArray(body.availability)) {
      const saved = [];
      for (const item of body.availability as Body[]) {
        const id = cleanNumber(item.id);
        if (!id) continue;
        const payload = buildPayload(item);
        const { data, error } = await supabaseAdmin
          .from("availability")
          .update(payload)
          .eq("site_slug", siteSlug)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        saved.push(data);
      }
      return NextResponse.json({ site_slug: siteSlug, availability: saved, message: "All availability changes saved." });
    }

    const id = cleanNumber(body.id);
    if (!id) return NextResponse.json({ error: "Availability ID is required." }, { status: 400 });
    const payload = buildPayload(body);
    const { data, error } = await supabaseAdmin
      .from("availability")
      .update(payload)
      .eq("site_slug", siteSlug)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, availability: data, message: "Availability saved." });
  } catch (error) {
    console.error("SAVE AVAILABILITY ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Availability could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const id = cleanNumber(new URL(request.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Availability ID is required." }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("availability")
      .delete()
      .eq("site_slug", siteSlug)
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, message: "Availability deleted." });
  } catch (error) {
    console.error("DELETE AVAILABILITY ERROR:", error);
    return NextResponse.json({ error: "Availability could not be deleted." }, { status: 500 });
  }
}
