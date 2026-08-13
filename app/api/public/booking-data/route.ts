import { NextResponse } from "next/server";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  try {
    const siteSlug = getServerSiteSlug(request);
    const today = todayString();
    const [sectionsResult, servicesResult, variationsResult, availabilityResult, bookingsResult, addonsResult, assignmentsResult, depositRulesResult, settingsResult] = await Promise.all([
      supabaseAdmin.from("service_sections").select("id,title,description,sort_order,is_active").eq("site_slug", siteSlug).eq("is_active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      supabaseAdmin.from("services").select("id,title,description,price,duration,payment_mode,deposit_type,deposit_value,sort_order,section_id,is_recurring,recurring_interval,recurring_count,recurring_label,allow_quantity,min_quantity,max_quantity,quantity_label").eq("site_slug", siteSlug).order("section_id", { ascending: true, nullsFirst: false }).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      supabaseAdmin.from("service_variations").select("id,service_id,variation_name,price,duration,payment_mode,deposit_type,deposit_value").eq("site_slug", siteSlug).order("created_at", { ascending: true }),
      supabaseAdmin.from("availability").select("id,available_date,available_time,start_time,end_time,timezone").eq("site_slug", siteSlug).gte("available_date", today).order("available_date", { ascending: true }),
      supabaseAdmin.from("bookings").select("id,booking_date,booking_time,booking_end_time,status").eq("site_slug", siteSlug).gte("booking_date", today),
      supabaseAdmin.from("service_addons").select("id,name,description,price,duration,payment_mode,deposit_type,deposit_value,is_active,sort_order,allow_quantity,min_quantity,max_quantity,quantity_label").eq("site_slug", siteSlug).eq("is_active", true).order("sort_order", { ascending: true }),
      supabaseAdmin.from("service_addon_assignments").select("id,service_id,addon_id,is_enabled").eq("site_slug", siteSlug).eq("is_enabled", true),
      supabaseAdmin.from("deposit_rules").select("id,name,rule_scope,price_basis,service_id,service_variation_id,client_email,payment_mode,deposit_type,deposit_value,min_total,max_total,priority,is_active").eq("site_slug", siteSlug).eq("is_active", true).order("priority", { ascending: true }),
      supabaseAdmin.from("site_settings").select("booking_slot_interval_minutes,booking_min_notice_hours,booking_max_advance_days,booking_buffer_before_minutes,booking_buffer_after_minutes,booking_allow_same_day,booking_auto_confirm").eq("site_slug", siteSlug).maybeSingle(),
    ]);

    for (const result of [sectionsResult, servicesResult, variationsResult, availabilityResult, bookingsResult, addonsResult, assignmentsResult, depositRulesResult, settingsResult]) {
      if (result.error) throw result.error;
    }

    return NextResponse.json({
      site_slug: siteSlug,
      sections: sectionsResult.data ?? [],
      services: servicesResult.data ?? [],
      variations: variationsResult.data ?? [],
      availability: availabilityResult.data ?? [],
      bookings: bookingsResult.data ?? [],
      addons: addonsResult.data ?? [],
      addon_assignments: assignmentsResult.data ?? [],
      deposit_rules: depositRulesResult.data ?? [],
      booking_settings: settingsResult.data ?? {},
    });
  } catch (error) {
    console.error("PUBLIC BOOKING DATA API ERROR:", error);
    return NextResponse.json({ error: "Booking information could not be loaded." }, { status: 500 });
  }
}
