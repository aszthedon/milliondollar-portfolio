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
  const functionKey = cleanText(body.function_key);
  const label = cleanText(body.label);
  if (!functionKey || !label) throw new Error("Function key and label are required.");

  return {
    function_key: functionKey,
    label,
    description: cleanText(body.description),
    href: cleanText(body.href),
    category: cleanText(body.category) || "dashboard",
    is_enabled: cleanBoolean(body.is_enabled, true),
    sort_order: cleanNumber(body.sort_order, 100),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const { data, error } = await supabaseAdmin
      .from("dashboard_function_settings")
      .select("*")
      .eq("site_slug", siteSlug)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, functions: data ?? [] });
  } catch (error) {
    console.error("LOAD DASHBOARD FUNCTIONS ERROR:", error);
    return NextResponse.json({ error: "Dashboard functions could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    if (Array.isArray(body.functions)) {
      const saved = [];
      for (const item of body.functions as Body[]) {
        const id = cleanNumber(item.id);
        const payload = buildPayload(item);
        const query = id
          ? supabaseAdmin.from("dashboard_function_settings").update(payload).eq("site_slug", siteSlug).eq("id", id).select("*").single()
          : supabaseAdmin.from("dashboard_function_settings").upsert({ site_slug: siteSlug, ...payload }, { onConflict: "site_slug,function_key" }).select("*").single();
        const { data, error } = await query;
        if (error) throw error;
        saved.push(data);
      }
      return NextResponse.json({ site_slug: siteSlug, functions: saved, message: "Dashboard functions saved." });
    }

    const id = cleanNumber(body.id);
    const payload = buildPayload(body);
    const query = id
      ? supabaseAdmin.from("dashboard_function_settings").update(payload).eq("site_slug", siteSlug).eq("id", id).select("*").single()
      : supabaseAdmin.from("dashboard_function_settings").upsert({ site_slug: siteSlug, ...payload }, { onConflict: "site_slug,function_key" }).select("*").single();
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, function: data, message: "Dashboard function saved." });
  } catch (error) {
    console.error("SAVE DASHBOARD FUNCTIONS ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dashboard functions could not be saved." }, { status: 500 });
  }
}
