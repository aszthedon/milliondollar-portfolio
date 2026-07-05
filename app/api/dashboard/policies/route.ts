import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type Body = Record<string, unknown>;

const policyFields = [
  "policies_title",
  "policies_intro",
  "booking_policy",
  "deposit_policy",
  "cancellation_policy",
  "late_policy",
  "no_show_policy",
  "refund_policy",
  "reschedule_policy",
  "preparation_policy",
  "extra_policy",
  "show_policies_link",
] as const;

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function buildPayload(body: Body) {
  return {
    policies_title: cleanText(body.policies_title),
    policies_intro: cleanText(body.policies_intro),
    booking_policy: cleanText(body.booking_policy),
    deposit_policy: cleanText(body.deposit_policy),
    cancellation_policy: cleanText(body.cancellation_policy),
    late_policy: cleanText(body.late_policy),
    no_show_policy: cleanText(body.no_show_policy),
    refund_policy: cleanText(body.refund_policy),
    reschedule_policy: cleanText(body.reschedule_policy),
    preparation_policy: cleanText(body.preparation_policy),
    extra_policy: cleanText(body.extra_policy),
    show_policies_link: cleanBoolean(body.show_policies_link, true),
    policies_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug();
    const { data, error } = await supabaseAdmin
      .from("site_settings")
      .select([...policyFields, "policies_updated_at"].join(","))
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      site_slug: siteSlug,
      policies: data,
      message: "Policies loaded.",
    });
  } catch (error) {
    console.error("LOAD POLICIES ERROR:", error);
    return NextResponse.json({ error: "Policies could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  try {
    const siteSlug = getServerSiteSlug();
    const body = (await request.json().catch(() => ({}))) as Body;
    const payload = buildPayload(body);

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
          .insert({ site_slug: siteSlug, ...payload })
          .select("*")
          .single();

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      site_slug: siteSlug,
      policies: data,
      message: "Policies saved.",
    });
  } catch (error) {
    console.error("SAVE POLICIES ERROR:", error);
    return NextResponse.json({ error: "Policies could not be saved." }, { status: 500 });
  }
}
