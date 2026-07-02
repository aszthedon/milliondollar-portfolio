import { NextResponse } from "next/server";

import { requireAdminRequest } from "@/lib/security/adminGuard";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getBookingId(body: Record<string, unknown>) {
  return Number(body.booking_id ?? body.bookingId ?? body.id);
}

function getBookingDate(body: Record<string, unknown>) {
  return String(body.booking_date ?? body.bookingDate ?? "").trim();
}

function getBookingTime(body: Record<string, unknown>) {
  return String(body.booking_time ?? body.bookingTime ?? "").trim();
}

async function updateBookingWithFallback({
  bookingId,
  bookingDate,
  bookingTime,
}: {
  bookingId: number;
  bookingDate: string;
  bookingTime: string;
}) {
  const richUpdate = {
    booking_date: bookingDate,
    booking_time: bookingTime,
    status: "rescheduled",
    booking_status: "rescheduled",
    rescheduled_at: new Date().toISOString(),
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
      booking_date: bookingDate,
      booking_time: bookingTime,
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
    const bookingDate = getBookingDate(body);
    const bookingTime = getBookingTime(body);

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

    if (!bookingDate || !bookingTime) {
      return NextResponse.json(
        {
          error: "A new booking date and booking time are required.",
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
      bookingDate,
      bookingTime,
    });

    return NextResponse.json({
      booking,
      message: "Booking rescheduled.",
    });
  } catch (error) {
    console.error("RESCHEDULE BOOKING ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Booking could not be rescheduled.",
      },
      {
        status: 500,
      }
    );
  }
}