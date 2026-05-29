import { NextResponse }
from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import { deleteCalendarEvent }
from "@/lib/deleteCalendarEvent";

import { sendCancellationEmail }
from "@/lib/sendCancellationEmail";

const supabase =
  createClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL!,
    process.env
      .SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(
  request: Request
) {
  try {
    const {
      bookingId,
    } =
      await request.json();

    if (
      !bookingId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing booking ID",
        },
        {
          status: 400,
        }
      );
    }

    const booking =
      await supabase
        .from("bookings")
        .select("*")
        .eq(
          "id",
          bookingId
        )
        .single();

    if (
      !booking.data
    ) {
      return NextResponse.json(
        {
          error:
            "Booking not found",
        },
        {
          status: 404,
        }
      );
    }

    if (
      booking.data
        .calendar_event_id
    ) {
      await deleteCalendarEvent(
        booking.data
          .calendar_event_id
      );
    }

    await supabase
      .from("bookings")
      .update({
        status:
          "cancelled",
      })
      .eq(
        "id",
        bookingId
      );

    await sendCancellationEmail({
      customerEmail:
        booking.data
          .customer_email,

      bookingDate:
        booking.data
          .booking_date,

      bookingTime:
        booking.data
          .booking_time,

      timezone:
        booking.data
          .timezone,
    });

    console.log(
      "BOOKING CANCELLED:",
      bookingId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "CANCEL BOOKING ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Cancellation failed",
      },
      {
        status: 500,
      }
    );
  }
}