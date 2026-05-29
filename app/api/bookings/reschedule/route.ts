import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

function timeToMinutes(
  time: string
) {

  const [h, m] =
    time.split(":");

  return (
    Number(h) * 60 +
    Number(m)
  );
}

function minutesToTime(
  minutes: number
) {

  const hours =
    Math.floor(
      minutes / 60
    );

  const mins =
    minutes % 60;

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    mins
  ).padStart(
    2,
    "0"
  )}`;
}

export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();

    const {
      bookingId,
      newDate,
      newTime,
    } = body;

    if (
      !bookingId ||
      !newDate ||
      !newTime
    ) {

      return NextResponse.json(
        {
          error:
            "Missing required fields.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: booking,
      error:
        bookingError,
    } =
      await supabaseAdmin
        .from(
          "bookings"
        )
        .select(
          `
          id,
          service_id,
          booking_time,
          booking_end_time,
          status
          `
        )
        .eq(
          "id",
          bookingId
        )
        .single();

    if (
      bookingError ||
      !booking
    ) {

      return NextResponse.json(
        {
          error:
            "Booking not found.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: service,
    } =
      await supabaseAdmin
        .from(
          "services"
        )
        .select(
          "duration"
        )
        .eq(
          "id",
          booking.service_id
        )
        .single();

    if (
      !service
    ) {

      return NextResponse.json(
        {
          error:
            "Service not found.",
        },
        {
          status: 404,
        }
      );
    }

    const duration =
      service.duration;

    const newEndTime =
      minutesToTime(
        timeToMinutes(
          newTime
        ) +
          duration
      );

    const {
      data:
        existingBookings,
    } =
      await supabaseAdmin
        .from(
          "bookings"
        )
        .select(
          `
          id,
          booking_time,
          booking_end_time
          `
        )
        .eq(
          "booking_date",
          newDate
        )
        .neq(
          "id",
          bookingId
        )
        .neq(
          "status",
          "cancelled"
        );

    const requestedStart =
      timeToMinutes(
        newTime
      );

    const requestedEnd =
      timeToMinutes(
        newEndTime
      );

    const conflict =
      (
        existingBookings ??
        []
      ).some(
        (
          row
        ) => {

          if (
            !row.booking_end_time
          ) {
            return false;
          }

          const existingStart =
            timeToMinutes(
              row.booking_time
            );

          const existingEnd =
            timeToMinutes(
              row.booking_end_time
            );

          return (
            requestedStart <
              existingEnd &&
            requestedEnd >
              existingStart
          );
        }
      );

    if (
      conflict
    ) {

      return NextResponse.json(
        {
          error:
            "That new time overlaps an existing booking.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      error:
        updateError,
    } =
      await supabaseAdmin
        .from(
          "bookings"
        )
        .update({

          booking_date:
            newDate,

          booking_time:
            newTime,

          booking_end_time:
            newEndTime,

          status:
            "rescheduled",
        })
        .eq(
          "id",
          bookingId
        );

    if (
      updateError
    ) {

      console.error(
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Reschedule failed.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
      }
    );

  } catch (
    error
  ) {

    console.error(
      error
    );

    return NextResponse.json(
      {
        error:
          "Server error.",
      },
      {
        status: 500,
      }
    );
  }
}