import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function cleanColor(value: unknown, fallback: string) {
  const text = cleanText(value);

  if (/^#[0-9a-fA-F]{6}$/.test(text)) {
    return text;
  }

  return fallback;
}

function cleanBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function buildSiteSettingsPayload(body: Body) {
  const brand = (body.branding ?? {}) as Body;
  const theme = (body.theme ?? {}) as Body;
  const content = (body.content ?? {}) as Body;
  const contact = (body.contact ?? {}) as Body;
  const footer = (body.footer ?? {}) as Body;

  const primaryColor = cleanColor(brand.primaryColor, "#ffffff");
  const secondaryColor = cleanColor(brand.secondaryColor, "#a1a1aa");
  const accentColor = cleanColor(brand.accentColor, "#3b82f6");
  const backgroundColor = cleanColor(brand.backgroundColor, "#000000");
  const foregroundColor = cleanColor(brand.foregroundColor, "#ffffff");
  const logoUrl = cleanText(brand.logoUrl);
  const faviconUrl = cleanText(brand.faviconUrl);
  const siteName = cleanText(content.siteName);

  return {
    business_name: siteName,
    navbar_brand_text: siteName,
    footer_brand_text: siteName,
    logo_url: logoUrl,
    favicon_url: faviconUrl,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    hero_heading: cleanText(content.heroHeading),
    hero_description: cleanText(content.heroDescription),
    header_cta_label: cleanText(content.headerCtaLabel),
    header_cta_href: cleanText(content.headerCtaHref),
    cta_heading: cleanText(content.ctaHeading),
    cta_description: cleanText(content.ctaDescription),
    cta_primary_label: cleanText(content.ctaPrimaryLabel),
    cta_primary_href: cleanText(content.ctaPrimaryHref),
    cta_secondary_label: cleanText(content.ctaSecondaryLabel),
    cta_secondary_href: cleanText(content.ctaSecondaryHref),
    show_cta_section: cleanBoolean(content.showCtaSection, true),
    show_dashboard_button: cleanBoolean(content.showDashboardButton, true),
    show_client_portal_button: cleanBoolean(content.showClientPortalButton, true),
    contact_heading: cleanText(contact.heading),
    contact_description: cleanText(contact.description),
    contact_button_label: cleanText(contact.buttonLabel),
    show_contact_section: cleanBoolean(contact.showSection, true),
    footer_description: cleanText(footer.description),
    footer_email: cleanText(footer.email),
    footer_phone: cleanText(footer.phone),
    footer_address: cleanText(footer.address),
    footer_instagram_url: cleanText(footer.instagramUrl),
    footer_facebook_url: cleanText(footer.facebookUrl),
    footer_tiktok_url: cleanText(footer.tiktokUrl),
    footer_youtube_url: cleanText(footer.youtubeUrl),
    show_footer: cleanBoolean(footer.showFooter, true),
    seo_title: cleanText(content.seoTitle) || siteName,
    seo_description: cleanText(content.seoDescription),
    seo_keywords: cleanText(content.seoKeywords),
    seo_og_image_url: cleanText(content.seoOgImageUrl),
    branding_settings: {
      logoUrl,
      faviconUrl,
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      foregroundColor,
    },
    theme_settings: {
      mode: cleanText(theme.mode) || "dark",
      style: cleanText(theme.style) || "premium",
      radius: cleanText(theme.radius) || "rounded",
      fontFamily: cleanText(theme.fontFamily),
    },
    dashboard_settings: {
      allowBrandEditing: true,
      allowThemeEditing: true,
      allowContentEditing: true,
      updatedFromDashboard: true,
    },
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const siteSlug = getServerSiteSlug();

    const [{ data: site, error: siteError }, { data: settings, error }] =
      await Promise.all([
        supabaseAdmin
          .from("sites")
          .select("*")
          .eq("site_slug", siteSlug)
          .maybeSingle(),
        supabaseAdmin
          .from("site_settings")
          .select("*")
          .eq("site_slug", siteSlug)
          .maybeSingle(),
      ]);

    if (siteError) {
      throw siteError;
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({
      site_slug: siteSlug,
      site,
      settings,
      message: "Site branding loaded.",
    });
  } catch (error) {
    console.error("LOAD SITE BRANDING ERROR:", error);

    return NextResponse.json(
      {
        error: "Site branding could not be loaded.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const siteSlug = getServerSiteSlug();
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildSiteSettingsPayload(body);

    const { data: existing } = await supabaseAdmin
      .from("site_settings")
      .select("id")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    const query = existing?.id
      ? supabaseAdmin
          .from("site_settings")
          .update(payload)
          .eq("site_slug", siteSlug)
          .select("*")
          .single()
      : supabaseAdmin
          .from("site_settings")
          .insert({
            site_slug: siteSlug,
            ...payload,
          })
          .select("*")
          .single();

    const { data: settings, error } = await query;

    if (error) {
      throw error;
    }

    await supabaseAdmin
      .from("sites")
      .update({
        name: payload.business_name,
        branding: payload.branding_settings,
        theme: payload.theme_settings,
        dashboard_settings: payload.dashboard_settings,
        updated_at: new Date().toISOString(),
      })
      .eq("site_slug", siteSlug);

    return NextResponse.json({
      site_slug: siteSlug,
      settings,
      message: "Site branding saved.",
    });
  } catch (error) {
    console.error("SAVE SITE BRANDING ERROR:", error);

    return NextResponse.json(
      {
        error: "Site branding could not be saved.",
      },
      {
        status: 500,
      }
    );
  }
}
