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

function buildLinkPayload(body: Body) {
  const label = cleanText(body.label);
  const href = cleanText(body.href);

  if (!label || !href) {
    throw new Error("Label and link are required.");
  }

  return {
    label,
    href,
    sort_order: cleanNumber(body.sort_order ?? body.sortOrder, 0),
    is_visible: cleanBoolean(body.is_visible ?? body.isVisible, true),
    opens_new_tab: cleanBoolean(body.opens_new_tab ?? body.opensNewTab, false),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const [{ data: links, error: linksError }, { data: settings, error: settingsError }] = await Promise.all([
      supabaseAdmin
        .from("navigation_links")
        .select("id,label,href,sort_order,is_visible,opens_new_tab")
        .eq("site_slug", siteSlug)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("site_settings")
        .select("seo_title,seo_description,business_name,navbar_brand_text,show_policies_link")
        .eq("site_slug", siteSlug)
        .maybeSingle(),
    ]);

    if (linksError) throw linksError;
    if (settingsError) throw settingsError;

    return NextResponse.json({ site_slug: siteSlug, links: links ?? [], settings, message: "Navigation loaded." });
  } catch (error) {
    console.error("LOAD NAVIGATION ERROR:", error);
    return NextResponse.json({ error: "Navigation could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildLinkPayload(body);

    const { data, error } = await supabaseAdmin
      .from("navigation_links")
      .insert({ site_slug: siteSlug, ...payload })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, link: data, message: "Navigation link created." });
  } catch (error) {
    console.error("CREATE NAVIGATION LINK ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Navigation link could not be created." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const linkId = cleanNumber(body.id);

    if (!linkId) return NextResponse.json({ error: "Link ID is required." }, { status: 400 });

    const payload = buildLinkPayload(body);
    const { data, error } = await supabaseAdmin
      .from("navigation_links")
      .update(payload)
      .eq("site_slug", siteSlug)
      .eq("id", linkId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, link: data, message: "Navigation link saved." });
  } catch (error) {
    console.error("SAVE NAVIGATION LINK ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Navigation link could not be saved." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const brandText = cleanText(body.navbar_brand_text);
    const now = new Date().toISOString();

    const payload = {
      seo_title: cleanText(body.seo_title) || brandText,
      seo_description: cleanText(body.seo_description),
      business_name: brandText,
      navbar_brand_text: brandText,
      footer_brand_text: brandText,
      show_policies_link: cleanBoolean(body.show_policies_link, true),
      updated_at: now,
    };

    const { data: existing } = await supabaseAdmin
      .from("site_settings")
      .select("id")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    const query = existing?.id
      ? supabaseAdmin.from("site_settings").update(payload).eq("site_slug", siteSlug).select("*").single()
      : supabaseAdmin.from("site_settings").insert({ site_slug: siteSlug, ...payload }).select("*").single();

    const { data, error } = await query;
    if (error) throw error;

    if (brandText) {
      await supabaseAdmin
        .from("sites")
        .update({ name: brandText, updated_at: now })
        .eq("site_slug", siteSlug);
    }

    return NextResponse.json({ site_slug: siteSlug, settings: data, message: "Navbar brand and tab settings saved." });
  } catch (error) {
    console.error("SAVE NAVIGATION SETTINGS ERROR:", error);
    return NextResponse.json({ error: "Navigation settings could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const url = new URL(request.url);
    const linkId = cleanNumber(url.searchParams.get("id"));

    if (!linkId) return NextResponse.json({ error: "Link ID is required." }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("navigation_links")
      .delete()
      .eq("site_slug", siteSlug)
      .eq("id", linkId);

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, message: "Navigation link deleted." });
  } catch (error) {
    console.error("DELETE NAVIGATION LINK ERROR:", error);
    return NextResponse.json({ error: "Navigation link could not be deleted." }, { status: 500 });
  }
}
