import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

const defaultSectionOrder = ["hero", "services", "booking", "gallery", "cta", "contact"];

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanOrder(value: unknown) {
  if (!Array.isArray(value)) return defaultSectionOrder;
  const allowed = new Set(defaultSectionOrder);
  const cleaned = value.map((item) => cleanText(item)).filter((item) => allowed.has(item));
  const missing = defaultSectionOrder.filter((item) => !cleaned.includes(item));
  return [...cleaned, ...missing];
}

function buildLayoutSettings(body: Body, existing: Body = {}) {
  const existingLayout = ((existing.homepage_layout_settings ?? {}) as Body) || {};

  return {
    sectionOrder: cleanOrder(body.sectionOrder ?? existingLayout.sectionOrder),
    showHero: cleanBoolean(body.showHero, cleanBoolean(existingLayout.showHero, true)),
    showServices: cleanBoolean(body.showServices, cleanBoolean(existingLayout.showServices, true)),
    showBooking: cleanBoolean(body.showBooking, cleanBoolean(existingLayout.showBooking, true)),
    showGallery: cleanBoolean(body.showGallery, cleanBoolean(existingLayout.showGallery, true)),
    showCta: cleanBoolean(body.showCta, cleanBoolean(existingLayout.showCta, true)),
    showContact: cleanBoolean(body.showContact, cleanBoolean(existingLayout.showContact, true)),
    heroLayout: cleanText(body.heroLayout) || cleanText(existingLayout.heroLayout) || "centered",
    servicesLayout: cleanText(body.servicesLayout) || cleanText(existingLayout.servicesLayout) || "cards",
  };
}

function buildPayload(body: Body, existing: Body = {}) {
  return {
    homepage_layout_settings: buildLayoutSettings(body, existing),
    hero_heading: cleanText(body.heroHeading) || cleanText(existing.hero_heading),
    hero_description: cleanText(body.heroDescription) || cleanText(existing.hero_description),
    home_eyebrow: cleanText(body.homeEyebrow) || cleanText(existing.home_eyebrow),
    home_services_heading: cleanText(body.servicesHeading) || cleanText(existing.home_services_heading),
    home_services_description: cleanText(body.servicesDescription) || cleanText(existing.home_services_description),
    home_booking_heading: cleanText(body.bookingHeading) || cleanText(existing.home_booking_heading),
    home_booking_description: cleanText(body.bookingDescription) || cleanText(existing.home_booking_description),
    home_gallery_heading: cleanText(body.galleryHeading) || cleanText(existing.home_gallery_heading),
    home_gallery_description: cleanText(body.galleryDescription) || cleanText(existing.home_gallery_description),
    home_contact_heading: cleanText(body.contactHeading) || cleanText(existing.home_contact_heading),
    home_contact_description: cleanText(body.contactDescription) || cleanText(existing.home_contact_description),
    cta_heading: cleanText(body.ctaHeading) || cleanText(existing.cta_heading),
    cta_description: cleanText(body.ctaDescription) || cleanText(existing.cta_description),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("homepage_layout_settings,hero_heading,hero_description,home_eyebrow,home_services_heading,home_services_description,home_booking_heading,home_booking_description,home_gallery_heading,home_gallery_description,home_contact_heading,home_contact_description,cta_heading,cta_description")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, settings: data ?? {} });
  } catch (error) {
    console.error("LOAD HOMEPAGE SETTINGS ERROR:", error);
    return NextResponse.json({ error: "Homepage settings could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("site_settings")
      .select("*")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (existingError) throw existingError;

    const payload = buildPayload(body, (existing ?? {}) as Body);
    const query = existing?.id
      ? supabaseAdmin.from("site_settings").update(payload).eq("site_slug", siteSlug).select("*").single()
      : supabaseAdmin.from("site_settings").insert({ site_slug: siteSlug, ...payload }).select("*").single();

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, settings: data, message: "Homepage appearance saved." });
  } catch (error) {
    console.error("SAVE HOMEPAGE SETTINGS ERROR:", error);
    return NextResponse.json({ error: "Homepage settings could not be saved." }, { status: 500 });
  }
}
