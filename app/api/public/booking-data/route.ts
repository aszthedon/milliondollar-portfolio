import { NextResponse } from "next/server";

import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  try {
    const siteSlug = getServerSiteSlug(request);
    const today = todayString();

    const [
      servicesResult,
      variationsResult,
      availabilityResult,
      bookingsResult,
      addonsResult,
      assignmentsResult,
      depositRulesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id,title,description,price,duration,payment_mode,deposit_type,deposit_value")
        .eq("site_slug", siteSlug)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("service_variations")
        .select("id,service_id,variation_name,price,duration,payment_mode,deposit_type,deposit_value")
        .eq("site_slug", siteSlug)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("availability")
        .select("id,available_date,available_time,start_time,end_time,timezone")
        .eq("site_slug", siteSlug)
        .gte("available_date", today)
        .order("available_date", { ascending: true }),
      supabaseAdmin
        .from("bookings")
        .select("id,booking_date,booking_time,booking_end_time,status")
        .eq("site_slug", siteSlug)
        .gte("booking_date", today),
      supabaseAdmin
        .from("service_addons")
        .select("id,name,description,price,duration,payment_mode,deposit_type,deposit_value,is_active,sort_order")
        .eq("site_slug", siteSlug)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_addon_assignments")
        .select("id,service_id,addon_id,is_enabled")
        .eq("site_slug", siteSlug)
        .eq("is_enabled", true),
      supabaseAdmin
        .from("deposit_rules")
        .select("id,name,rule_scope,service_id,service_variation_id,client_email,payment_mode,deposit_type,deposit_value,min_total,max_total,priority,is_active")
        .eq("site_slug", siteSlug)
        .eq("is_active", true)
        .order("priority", { ascending: true }),
    ]);

    if (servicesResult.error) throw servicesResult.error;
    if (variationsResult.error) throw variationsResult.error;
    if (availabilityResult.error) throw availabilityResult.error;
    if (bookingsResult.error) throw bookingsResult.error;
    if (addonsResult.error) throw addonsResult.error;
    if (assignmentsResult.error) throw assignmentsResult.error;
    if (depositRulesResult.error) throw depositRulesResult.error;

    return NextResponse.json({
      site_slug: siteSlug,
      services: servicesResult.data ?? [],
      variations: variationsResult.data ?? [],
      availability: availabilityResult.data ?? [],
      bookings: bookingsResult.data ?? [],
      addons: addonsResult.data ?? [],
      addon_assignments: assignmentsResult.data ?? [],
      deposit_rules: depositRulesResult.data ?? [],
    });
  } catch (error) {
    console.error("PUBLIC BOOKING DATA API ERROR:", error);
    return NextResponse.json({ error: "Booking information could not be loaded." }, { status: 500 });
  }
}
