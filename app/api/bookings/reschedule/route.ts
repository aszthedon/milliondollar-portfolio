import { NextResponse } from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import { updateCalendarEvent }
from "@/lib/updateCalendarEvent";

import { sendRescheduleEmail }
from "@/lib/sendRescheduleEmail";

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
      newDate,
      newTime,
    } =
      await request.json();

    if (
      !bookingId ||
      !newDate ||
      !newTime
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields",
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

    const slotCheck =
      await supabase
        .from("availability")
        .select("*")
        .eq(
          "available_date",
          newDate
        )
        .eq(
          "available_time",
          newTime
        )
        .maybeSingle();

    if (
      !slotCheck.data
    ) {
      return NextResponse.json(
        {
          error:
            "Selected slot unavailable",
        },
        {
          status: 409,
        }
      );
    }

    await supabase
      .from("availability")
      .insert({
        available_date:
          booking.data
            .booking_date,

        available_time:
          booking.data
            .booking_time,

        timezone:
          booking.data
            .timezone,
      });

    await supabase
      .from("availability")
      .delete()
      .eq(
        "available_date",
        newDate
      )
      .eq(
        "available_time",
        newTime
      );

    await supabase
      .from("bookings")
      .update({
        booking_date:
          newDate,

        booking_time:
          newTime,

        status:
          "rescheduled",
      })
      .eq(
        "id",
        bookingId
      );

    if (
      booking.data
        .calendar_event_id
    ) {
      await updateCalendarEvent({
        calendarEventId:
          booking.data
            .calendar_event_id,

        customerEmail:
          booking.data
            .customer_email,

        bookingDate:
          newDate,

        bookingTime:
          newTime,

        timezone:
          booking.data
            .timezone,
      });
    }

    await sendRescheduleEmail({
      customerEmail:
        booking.data
          .customer_email,

      bookingDate:
        newDate,

      bookingTime:
        newTime,

      timezone:
        booking.data
          .timezone,

      meetingLink:
        booking.data
          .meeting_link,
    });

    console.log(
      "BOOKING RESCHEDULED:",
      bookingId
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "RESCHEDULE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Reschedule failed",
      },
      {
        status: 500,
      }
    );
  }
}