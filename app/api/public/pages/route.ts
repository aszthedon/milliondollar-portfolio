import { NextResponse } from "next/server";

import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const siteSlug = getServerSiteSlug(request);
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    let query = supabaseAdmin
      .from("site_pages")
      .select("*")
      .eq("site_slug", siteSlug)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    if (slug) query = query.eq("slug", slug).limit(1);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      site_slug: siteSlug,
      pages: data ?? [],
      page: slug ? data?.[0] ?? null : null,
    });
  } catch (error) {
    console.error("PUBLIC SITE PAGES ERROR:", error);
    return NextResponse.json({ error: "Pages could not be loaded." }, { status: 500 });
  }
}
