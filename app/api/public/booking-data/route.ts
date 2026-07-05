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

export async function GET() {
  try {
    const siteSlug = getServerSiteSlug();
    const today = todayString();

    const [servicesResult, variationsResult, availabilityResult, bookingsResult] = await Promise.all([
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
    ]);

    if (servicesResult.error) throw servicesResult.error;
    if (variationsResult.error) throw variationsResult.error;
    if (availabilityResult.error) throw availabilityResult.error;
    if (bookingsResult.error) throw bookingsResult.error;

    return NextResponse.json({
      site_slug: siteSlug,
      services: servicesResult.data ?? [],
      variations: variationsResult.data ?? [],
      availability: availabilityResult.data ?? [],
      bookings: bookingsResult.data ?? [],
    });
  } catch (error) {
    console.error("PUBLIC BOOKING DATA API ERROR:", error);
    return NextResponse.json({ error: "Booking information could not be loaded." }, { status: 500 });
  }
}
