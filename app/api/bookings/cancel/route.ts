import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getBookingId(body: Record<string, unknown>) {
  return Number(body.booking_id ?? body.bookingId ?? body.id);
}

async function updateBookingWithFallback({
  bookingId,
  reason,
}: {
  bookingId: number;
  reason: string;
}) {
  const richUpdate = {
    status: "cancelled",
    booking_status: "cancelled",
    cancellation_reason: reason,
    cancelled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .update(richUpdate)
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();

  if (!error) {
    return data;
  }

  const { data: fallbackData, error: fallbackError } = await supabaseAdmin
    .from("bookings")
    .update({
      status: "cancelled",
    })
    .eq("id", bookingId)
    .select("*")
    .maybeSingle();

  if (fallbackError) {
    throw fallbackError;
  }

  return fallbackData;
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminRequest(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));

    const bookingId = getBookingId(body);
    const reason = String(body.reason ?? "Cancelled from dashboard.").trim();

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

    const { data: existingBooking, error: existingError } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingBooking) {
      return NextResponse.json(
        {
          error: "Booking was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const booking = await updateBookingWithFallback({
      bookingId,
      reason,
    });

    return NextResponse.json({
      booking,
      message: "Booking cancelled.",
    });
  } catch (error) {
    console.error("CANCEL BOOKING ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Booking could not be cancelled.",
      },
      {
        status: 500,
      }
    );
  }
}