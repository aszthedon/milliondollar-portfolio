import { NextResponse } from "next/server";

import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const siteSlug = getServerSiteSlug(request);

    const [serviceResult, galleryResult, settingsResult] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id,title,description,image_url,image_alt_text,sort_order,section_id")
        .eq("site_slug", siteSlug)
        .eq("show_in_gallery", true)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("gallery_images")
        .select("id,image_url")
        .eq("site_slug", siteSlug)
        .order("id", { ascending: false }),
      supabaseAdmin
        .from("site_settings")
        .select("home_gallery_heading,home_gallery_description")
        .eq("site_slug", siteSlug)
        .maybeSingle(),
    ]);

    if (serviceResult.error) throw serviceResult.error;
    if (galleryResult.error) console.error("LEGACY GALLERY LOAD ERROR:", galleryResult.error);
    if (settingsResult.error) console.error("GALLERY SETTINGS LOAD ERROR:", settingsResult.error);

    const serviceImages = (serviceResult.data ?? []).map((service) => ({
      id: `service-${service.id}`,
      image_url: service.image_url,
      alt_text: service.image_alt_text || service.title,
      title: service.title,
      description: service.description,
      source: "service",
    }));

    const legacyImages = (galleryResult.data ?? []).map((image) => ({
      id: `gallery-${image.id}`,
      image_url: image.image_url,
      alt_text: "Gallery image",
      title: null,
      description: null,
      source: "gallery",
    }));

    return NextResponse.json({
      site_slug: siteSlug,
      images: [...serviceImages, ...legacyImages],
      settings: settingsResult.data ?? null,
    });
  } catch (error) {
    console.error("PUBLIC GALLERY API ERROR:", error);
    return NextResponse.json({ error: "Gallery could not be loaded." }, { status: 500 });
  }
}
