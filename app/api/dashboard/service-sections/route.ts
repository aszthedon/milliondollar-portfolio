import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

function cleanText(value: unknown) { return String(value ?? "").trim(); }
function cleanNumber(value: unknown, fallback = 0) { const number = Number(value ?? fallback); return Number.isFinite(number) ? number : fallback; }
function cleanBoolean(value: unknown, fallback: boolean) { return typeof value === "boolean" ? value : fallback; }

function buildPayload(body: Body) {
  const title = cleanText(body.title);
  if (!title) throw new Error("Section title is required.");
  return {
    title,
    description: cleanText(body.description),
    sort_order: cleanNumber(body.sort_order, 100),
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
      .from("service_sections")
      .select("*")
      .eq("site_slug", siteSlug)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, sections: data ?? [] });
  } catch (error) {
    console.error("LOAD SERVICE SECTIONS ERROR:", error);
    return NextResponse.json({ error: "Service sections could not be loaded." }, { status: 500 });
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
      .from("service_sections")
      .insert({ site_slug: siteSlug, ...payload })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, section: data, message: "Service section created." });
  } catch (error) {
    console.error("CREATE SERVICE SECTION ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Service section could not be created." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    if (Array.isArray(body.sections)) {
      const saved = [];
      for (const item of body.sections as Body[]) {
        const id = cleanNumber(item.id);
        if (!id) continue;
        const payload = buildPayload(item);
        const { data, error } = await supabaseAdmin
          .from("service_sections")
          .update(payload)
          .eq("site_slug", siteSlug)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        saved.push(data);
      }
      return NextResponse.json({ site_slug: siteSlug, sections: saved, message: "Service sections saved." });
    }

    const id = cleanNumber(body.id);
    if (!id) return NextResponse.json({ error: "Section ID is required." }, { status: 400 });
    const payload = buildPayload(body);
    const { data, error } = await supabaseAdmin
      .from("service_sections")
      .update(payload)
      .eq("site_slug", siteSlug)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, section: data, message: "Service section saved." });
  } catch (error) {
    console.error("SAVE SERVICE SECTION ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Service section could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const id = cleanNumber(new URL(request.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Section ID is required." }, { status: 400 });

    await supabaseAdmin.from("services").update({ section_id: null }).eq("site_slug", siteSlug).eq("section_id", id);
    const { error } = await supabaseAdmin.from("service_sections").delete().eq("site_slug", siteSlug).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, message: "Service section deleted." });
  } catch (error) {
    console.error("DELETE SERVICE SECTION ERROR:", error);
    return NextResponse.json({ error: "Service section could not be deleted." }, { status: 500 });
  }
}
