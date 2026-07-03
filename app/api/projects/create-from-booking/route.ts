import crypto from "crypto";
import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { getServerSiteSlug } from "@/lib/site/siteConfig";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getBookingId(body: Record<string, unknown>) {
  return Number(body.booking_id ?? body.bookingId ?? body.id);
}

function getProjectTitle(booking: Record<string, unknown>) {
  return String(
    booking.service_name ||
      booking.service_title ||
      booking.title ||
      booking.event_title ||
      `Booking Project #${booking.id}`
  );
}

function getClientName(booking: Record<string, unknown>) {
  return String(
    booking.customer_name ||
      booking.client_name ||
      booking.name ||
      booking.customer_email ||
      booking.email ||
      "Booking Client"
  );
}

function getClientEmail(booking: Record<string, unknown>) {
  return String(
    booking.customer_email || booking.client_email || booking.email || ""
  ).trim();
}

async function updateBookingProjectId({
  bookingId,
  projectId,
  siteSlug,
}: {
  bookingId: number;
  projectId: number;
  siteSlug: string;
}) {
  await supabaseAdmin
    .from("bookings")
    .update({
      project_id: projectId,
      updated_at: new Date().toISOString(),
    })
    .eq("site_slug", siteSlug)
    .eq("id", bookingId);
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const siteSlug = getServerSiteSlug();
    const bookingId = getBookingId(body);

    if (!Number.isFinite(bookingId)) {
      return NextResponse.json(
        {
          error: "A valid booking ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("site_slug", siteSlug)
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }

    if (!booking) {
      return NextResponse.json(
        {
          error: "Booking was not found for this site.",
        },
        {
          status: 404,
        }
      );
    }

    const portalToken = crypto.randomBytes(32).toString("hex");

    const insertPayload = {
      site_slug: siteSlug,
      project_title: getProjectTitle(booking),
      title: getProjectTitle(booking),
      client_id: booking.client_id ?? null,
      client_name: getClientName(booking),
      client_email: getClientEmail(booking),
      project_status: "active",
      status: "active",
      source_type: "booking",
      source_id: bookingId,
      booking_id: bookingId,
      project_portal_token: portalToken,
      description: String(booking.notes ?? ""),
      due_date: booking.booking_date ?? null,
    };

    const { data: project, error: projectError } = await supabaseAdmin
      .from("media_projects")
      .insert(insertPayload)
      .select("*")
      .single();

    if (projectError) {
      throw projectError;
    }

    await updateBookingProjectId({
      bookingId,
      projectId: project.id,
      siteSlug,
    }).catch(() => null);

    return NextResponse.json({
      project,
      message: "Project created from booking.",
    });
  } catch (error) {
    console.error("CREATE PROJECT FROM BOOKING ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Project could not be created.",
      },
      {
        status: 500,
      }
    );
  }
}
