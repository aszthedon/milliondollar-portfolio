import { NextResponse } from "next/server";

import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const siteSlug = getServerSiteSlug(request);
    const { data, error } = await supabaseAdmin
      .from("service_sections")
      .select("id,title,description,sort_order,is_active")
      .eq("site_slug", siteSlug)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ site_slug: siteSlug, sections: data ?? [] });
  } catch (error) {
    console.error("PUBLIC SERVICE SECTIONS ERROR:", error);
    return NextResponse.json({ error: "Service sections could not be loaded." }, { status: 500 });
  }
}
