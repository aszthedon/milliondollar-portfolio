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

function slugify(value: unknown) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildPayload(body: Body) {
  const title = cleanText(body.title);
  const slug = slugify(body.slug || title);
  if (!title || !slug) throw new Error("Page title and slug are required.");

  return {
    title,
    slug,
    page_type: cleanText(body.page_type) || "custom",
    status: cleanText(body.status) || "published",
    sort_order: cleanNumber(body.sort_order, 100),
    show_in_header: cleanBoolean(body.show_in_header, true),
    show_in_footer: cleanBoolean(body.show_in_footer, false),
    opens_new_tab: cleanBoolean(body.opens_new_tab, false),
    seo_title: cleanText(body.seo_title) || null,
    seo_description: cleanText(body.seo_description) || null,
    hero_eyebrow: cleanText(body.hero_eyebrow) || null,
    hero_heading: cleanText(body.hero_heading) || title,
    hero_description: cleanText(body.hero_description) || null,
    body_content: cleanText(body.body_content) || null,
    cta_label: cleanText(body.cta_label) || null,
    cta_href: cleanText(body.cta_href) || null,
    layout_style: cleanText(body.layout_style) || "standard",
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const { data, error } = await supabaseAdmin.from("site_pages").select("*").eq("site_slug", siteSlug).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, pages: data ?? [] });
  } catch (error) {
    console.error("LOAD SITE PAGES ERROR:", error);
    return NextResponse.json({ error: "Pages could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildPayload(body);
    const { data, error } = await supabaseAdmin.from("site_pages").insert({ site_slug: siteSlug, ...payload }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, page: data, message: "Page created." });
  } catch (error) {
    console.error("CREATE SITE PAGE ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Page could not be created." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const id = cleanNumber(body.id);
    if (!id) return NextResponse.json({ error: "Page ID is required." }, { status: 400 });
    const payload = buildPayload(body);
    const { data, error } = await supabaseAdmin.from("site_pages").update(payload).eq("site_slug", siteSlug).eq("id", id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, page: data, message: "Page saved." });
  } catch (error) {
    console.error("SAVE SITE PAGE ERROR:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Page could not be saved." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const id = cleanNumber(new URL(request.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Page ID is required." }, { status: 400 });
    const { error } = await supabaseAdmin.from("site_pages").delete().eq("site_slug", siteSlug).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, message: "Page deleted." });
  } catch (error) {
    console.error("DELETE SITE PAGE ERROR:", error);
    return NextResponse.json({ error: "Page could not be deleted." }, { status: 500 });
  }
}
