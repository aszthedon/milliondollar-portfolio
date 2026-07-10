import { NextResponse } from "next/server";

import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function safeSettings(settings: Record<string, unknown> | null) {
  const branding = (settings?.branding_settings ?? {}) as Record<string, unknown>;
  const theme = (settings?.theme_settings ?? {}) as Record<string, unknown>;

  return {
    business_name: settings?.business_name ?? "",
    navbar_brand_text: settings?.navbar_brand_text ?? settings?.business_name ?? "",
    footer_brand_text: settings?.footer_brand_text ?? settings?.business_name ?? settings?.navbar_brand_text ?? "",
    footer_description: settings?.footer_description ?? "",
    footer_email: settings?.footer_email ?? settings?.email ?? "",
    footer_phone: settings?.footer_phone ?? settings?.phone ?? "",
    footer_address: settings?.footer_address ?? settings?.address ?? "",
    footer_instagram_url: settings?.footer_instagram_url ?? settings?.instagram ?? "",
    footer_facebook_url: settings?.footer_facebook_url ?? settings?.facebook_url ?? "",
    footer_tiktok_url: settings?.footer_tiktok_url ?? settings?.tiktok ?? "",
    footer_youtube_url: settings?.footer_youtube_url ?? settings?.youtube_url ?? "",
    footer_copyright_text: settings?.footer_copyright_text ?? "",
    show_footer: settings?.show_footer ?? true,
    show_policies_link: settings?.show_policies_link ?? true,
    header_cta_label: settings?.header_cta_label ?? "Book Now",
    header_cta_href: settings?.header_cta_href ?? "/#booking",
    show_dashboard_button: settings?.show_dashboard_button ?? true,
    show_client_portal_button: settings?.show_client_portal_button ?? false,
    seo_title: settings?.seo_title ?? settings?.business_name ?? "",
    seo_description: settings?.seo_description ?? "",
    primary_color: settings?.primary_color ?? branding.primaryColor ?? "#ffffff",
    secondary_color: settings?.secondary_color ?? branding.secondaryColor ?? "#a1a1aa",
    accent_color: branding.accentColor ?? settings?.primary_color ?? "#ffffff",
    background_color: branding.backgroundColor ?? "#000000",
    foreground_color: branding.foregroundColor ?? "#ffffff",
    logo_url: settings?.logo_url ?? branding.logoUrl ?? "",
    favicon_url: settings?.favicon_url ?? branding.faviconUrl ?? "",
    theme_mode: theme.mode ?? "dark",
    theme_style: theme.style ?? "premium",
    custom_css: settings?.custom_css ?? "",
    homepage_layout_settings: settings?.homepage_layout_settings ?? {},
    home_eyebrow: settings?.home_eyebrow ?? "Book Now",
    hero_heading: settings?.hero_heading ?? "",
    hero_description: settings?.hero_description ?? "",
    home_services_heading: settings?.home_services_heading ?? "Services",
    home_services_description: settings?.home_services_description ?? "",
    home_booking_heading: settings?.home_booking_heading ?? "Reserve Your Spot",
    home_booking_description: settings?.home_booking_description ?? "",
    home_gallery_heading: settings?.home_gallery_heading ?? "Gallery",
    home_gallery_description: settings?.home_gallery_description ?? "",
    home_contact_heading: settings?.home_contact_heading ?? settings?.contact_heading ?? "Contact",
    home_contact_description: settings?.home_contact_description ?? settings?.contact_description ?? "",
    cta_heading: settings?.cta_heading ?? "",
    cta_description: settings?.cta_description ?? "",
  };
}

export async function GET(request: Request) {
  try {
    const siteSlug = getServerSiteSlug(request);

    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select("*")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ site_slug: siteSlug, settings: safeSettings((data ?? {}) as Record<string, unknown>) });
  } catch (error) {
    console.error("PUBLIC SITE SETTINGS ERROR:", error);
    return NextResponse.json({ error: "Site settings could not be loaded." }, { status: 500 });
  }
}
