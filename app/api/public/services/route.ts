import { NextResponse } from "next/server";

import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const siteSlug = getServerSiteSlug(request);

    const [{ data: services, error: servicesError }, { data: settings, error: settingsError }] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id,title,description,price,duration,payment_mode,deposit_type,deposit_value,sort_order,is_recurring,recurring_interval,recurring_count,recurring_label")
        .eq("site_slug", siteSlug)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("site_settings")
        .select("business_name,navbar_brand_text")
        .eq("site_slug", siteSlug)
        .maybeSingle(),
    ]);

    if (servicesError) throw servicesError;
    if (settingsError) throw settingsError;

    return NextResponse.json({ site_slug: siteSlug, services: services ?? [], settings });
  } catch (error) {
    console.error("PUBLIC SERVICES API ERROR:", error);
    return NextResponse.json({ error: "Services could not be loaded." }, { status: 500 });
  }
}
