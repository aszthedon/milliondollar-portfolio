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

function cleanTextWithFallback(value: unknown, fallback: unknown) {
  const text = cleanText(value);
  return text || cleanText(fallback);
}

function buildSiteSettingsPayload(body: Body, existingSettings: Body = {}) {
  const brand = (body.branding ?? {}) as Body;
  const theme = (body.theme ?? {}) as Body;
  const content = (body.content ?? {}) as Body;
  const contact = (body.contact ?? {}) as Body;
  const footer = (body.footer ?? {}) as Body;

  const primaryColor = cleanColor(brand.primaryColor, cleanText(existingSettings.primary_color) || "#ffffff");
  const secondaryColor = cleanColor(brand.secondaryColor, cleanText(existingSettings.secondary_color) || "#a1a1aa");
  const accentColor = cleanColor(brand.accentColor, cleanText(existingSettings.accent_color) || "#3b82f6");
  const backgroundColor = cleanColor(brand.backgroundColor, cleanText(existingSettings.background_color) || "#000000");
  const foregroundColor = cleanColor(brand.foregroundColor, cleanText(existingSettings.foreground_color) || "#ffffff");
  const logoUrl = cleanTextWithFallback(brand.logoUrl, existingSettings.logo_url);
  const faviconUrl = cleanTextWithFallback(brand.faviconUrl, existingSettings.favicon_url);
  const siteName = cleanTextWithFallback(content.siteName, existingSettings.business_name || existingSettings.navbar_brand_text);

  return {
    business_name: siteName,
    navbar_brand_text: siteName,
    footer_brand_text: siteName,
    logo_url: logoUrl,
    favicon_url: faviconUrl,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    hero_heading: cleanTextWithFallback(content.heroHeading, existingSettings.hero_heading),
    hero_description: cleanTextWithFallback(content.heroDescription, existingSettings.hero_description),
    header_cta_label: cleanTextWithFallback(content.headerCtaLabel, existingSettings.header_cta_label),
    header_cta_href: cleanTextWithFallback(content.headerCtaHref, existingSettings.header_cta_href),
    cta_heading: cleanTextWithFallback(content.ctaHeading, existingSettings.cta_heading),
    cta_description: cleanTextWithFallback(content.ctaDescription, existingSettings.cta_description),
    cta_primary_label: cleanTextWithFallback(content.ctaPrimaryLabel, existingSettings.cta_primary_label),
    cta_primary_href: cleanTextWithFallback(content.ctaPrimaryHref, existingSettings.cta_primary_href),
    cta_secondary_label: cleanTextWithFallback(content.ctaSecondaryLabel, existingSettings.cta_secondary_label),
    cta_secondary_href: cleanTextWithFallback(content.ctaSecondaryHref, existingSettings.cta_secondary_href),
    show_cta_section: cleanBoolean(content.showCtaSection, cleanBoolean(existingSettings.show_cta_section, true)),
    show_dashboard_button: cleanBoolean(content.showDashboardButton, cleanBoolean(existingSettings.show_dashboard_button, true)),
    show_client_portal_button: cleanBoolean(content.showClientPortalButton, cleanBoolean(existingSettings.show_client_portal_button, true)),
    contact_heading: cleanTextWithFallback(contact.heading, existingSettings.contact_heading),
    contact_description: cleanTextWithFallback(contact.description, existingSettings.contact_description),
    contact_button_label: cleanTextWithFallback(contact.buttonLabel, existingSettings.contact_button_label),
    show_contact_section: cleanBoolean(contact.showSection, cleanBoolean(existingSettings.show_contact_section, true)),
    footer_description: cleanTextWithFallback(footer.description, existingSettings.footer_description),
    footer_email: cleanTextWithFallback(footer.email, existingSettings.footer_email),
    footer_phone: cleanTextWithFallback(footer.phone, existingSettings.footer_phone),
    footer_address: cleanTextWithFallback(footer.address, existingSettings.footer_address),
    footer_instagram_url: cleanTextWithFallback(footer.instagramUrl, existingSettings.footer_instagram_url),
    footer_facebook_url: cleanTextWithFallback(footer.facebookUrl, existingSettings.footer_facebook_url),
    footer_tiktok_url: cleanTextWithFallback(footer.tiktokUrl, existingSettings.footer_tiktok_url),
    footer_youtube_url: cleanTextWithFallback(footer.youtubeUrl, existingSettings.footer_youtube_url),
    footer_copyright_text: cleanTextWithFallback(footer.copyrightText, existingSettings.footer_copyright_text),
    show_footer: cleanBoolean(footer.showFooter, cleanBoolean(existingSettings.show_footer, true)),
    seo_title: cleanTextWithFallback(content.seoTitle, existingSettings.seo_title || siteName),
    seo_description: cleanTextWithFallback(content.seoDescription, existingSettings.seo_description),
    seo_keywords: cleanTextWithFallback(content.seoKeywords, existingSettings.seo_keywords),
    seo_og_image_url: cleanTextWithFallback(content.seoOgImageUrl, existingSettings.seo_og_image_url),
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
      mode: cleanTextWithFallback(theme.mode, (existingSettings.theme_settings as Body | undefined)?.mode || "dark"),
      style: cleanTextWithFallback(theme.style, (existingSettings.theme_settings as Body | undefined)?.style || "premium"),
      radius: cleanTextWithFallback(theme.radius, (existingSettings.theme_settings as Body | undefined)?.radius || "rounded"),
      fontFamily: cleanTextWithFallback(theme.fontFamily, (existingSettings.theme_settings as Body | undefined)?.fontFamily),
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
    const siteSlug = getServerSiteSlug(request);

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
    const siteSlug = getServerSiteSlug(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const { data: existing } = await supabaseAdmin
      .from("site_settings")
      .select("*")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    const payload = buildSiteSettingsPayload(body, (existing ?? {}) as Body);

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
