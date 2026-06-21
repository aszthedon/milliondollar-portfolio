import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!,
  {
    apiVersion: "2026-04-22.dahlia",
  }
);

function getSiteUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function timeToMinutes(time: string) {
  const [hourString, minuteString] =
    time.split(":");

  return (
    Number(hourString) * 60 +
    Number(minuteString ?? "0")
  );
}

function minutesToTime(minutes: number) {
  const hours =
    Math.floor(minutes / 60) % 24;

  const mins =
    minutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(mins).padStart(
    2,
    "0"
  )}`;
}

function addMinutesToTime(
  time: string,
  minutesToAdd: number
) {
  return minutesToTime(
    timeToMinutes(time) +
      minutesToAdd
  );
}

function isCancelledStatus(
  status: string | null
) {
  return (
    status === "cancelled" ||
    status === "rejected"
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      service_id,
      variation_id,
      service_name,
      price,
      duration,
      customer_email,
      booking_date,
      booking_time,
      booking_end_time,
      notes,
      timezone,
      client_id,
    } = body;

    const numericPrice =
      Number(price);

    const numericDuration =
      Number(duration);

    const serviceId =
      service_id
        ? Number(service_id)
        : null;

    const variationId =
      variation_id
        ? Number(variation_id)
        : null;

    if (
      !service_name ||
      !customer_email ||
      !booking_date ||
      !booking_time ||
      !timezone ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required checkout information.",
        },
        {
          status: 400,
        }
      );
    }

    const bookingEndTime =
      booking_end_time ??
      addMinutesToTime(
        booking_time,
        Number.isFinite(
          numericDuration
        ) && numericDuration > 0
          ? numericDuration
          : 60
      );

    const requestedStart =
      timeToMinutes(booking_time);

    const requestedEnd =
      timeToMinutes(bookingEndTime);

    if (
      requestedEnd <= requestedStart
    ) {
      return NextResponse.json(
        {
          error:
            "Booking end time must be after the start time.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: availabilityWindows,
      error: availabilityError,
    } = await supabaseAdmin
      .from("availability")
      .select(
        `
          id,
          available_date,
          available_time,
          start_time,
          end_time,
          timezone
        `
      )
      .eq(
        "available_date",
        booking_date
      );

    if (availabilityError) {
      console.error(
        "AVAILABILITY LOOKUP ERROR:",
        availabilityError
      );

      return NextResponse.json(
        {
          error:
            "Availability could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    const fitsAvailability =
      (
        availabilityWindows ?? []
      ).some((window) => {
        const windowStart =
          window.start_time ??
          window.available_time;

        const windowEnd =
          window.end_time;

        if (
          !windowStart ||
          !windowEnd
        ) {
          return false;
        }

        const availableStart =
          timeToMinutes(windowStart);

        const availableEnd =
          timeToMinutes(windowEnd);

        return (
          requestedStart >=
            availableStart &&
          requestedEnd <=
            availableEnd
        );
      });

    if (!fitsAvailability) {
      return NextResponse.json(
        {
          error:
            "This time is no longer available.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: existingBookings,
      error: existingBookingsError,
    } = await supabaseAdmin
      .from("bookings")
      .select(
        `
          id,
          booking_time,
          booking_end_time,
          status
        `
      )
      .eq(
        "booking_date",
        booking_date
      );

    if (existingBookingsError) {
      console.error(
        "EXISTING BOOKING LOOKUP ERROR:",
        existingBookingsError
      );

      return NextResponse.json(
        {
          error:
            "Existing bookings could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    const hasConflict =
      (
        existingBookings ?? []
      ).some((booking) => {
        if (
          isCancelledStatus(
            booking.status
          )
        ) {
          return false;
        }

        if (
          !booking.booking_time ||
          !booking.booking_end_time
        ) {
          return false;
        }

        const existingStart =
          timeToMinutes(
            booking.booking_time
          );

        const existingEnd =
          timeToMinutes(
            booking.booking_end_time
          );

        return (
          requestedStart <
            existingEnd &&
          requestedEnd >
            existingStart
        );
      });

    if (hasConflict) {
      return NextResponse.json(
        {
          error:
            "This time overlaps with an existing booking.",
        },
        {
          status: 409,
        }
      );
    }

    const cleanNotes =
      typeof notes === "string"
        ? notes.trim()
        : "";

    const normalizedNotes =
      variationId
        ? [
            cleanNotes,
            `Variation ID: ${variationId}`,
          ]
            .filter(Boolean)
            .join("\n")
        : cleanNotes;

    const {
      data: booking,
      error: bookingError,
    } = await supabaseAdmin
      .from("bookings")
      .insert({
        client_id:
          client_id || null,

        service_id:
          serviceId,

        customer_email,

        booking_date,

        booking_time,

        booking_end_time:
          bookingEndTime,

        payment_status:
          "pending",

        status:
          "pending",

        notes:
          normalizedNotes,

        timezone,

        price_paid:
          numericPrice,
      })
      .select()
      .single();

    if (
      bookingError ||
      !booking
    ) {
      console.error(
        "BOOKING CREATION ERROR:",
        bookingError
      );

      return NextResponse.json(
        {
          error:
            "Booking creation failed.",
        },
        {
          status: 500,
        }
      );
    }

    const siteUrl =
      getSiteUrl(request);

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        customer_email,

        payment_method_types: [
          "card",
        ],

        line_items: [
          {
            price_data: {
              currency: "usd",

              product_data: {
                name: service_name,
              },

              unit_amount:
                Math.round(
                  numericPrice * 100
                ),
            },

            quantity: 1,
          },
        ],

        metadata: {
          bookingId:
            booking.id.toString(),

          serviceId:
            serviceId
              ? serviceId.toString()
              : "",

          variationId:
            variationId
              ? variationId.toString()
              : "",

          bookingDate:
            booking_date,

          bookingTime:
            booking_time,

          bookingEndTime,

          pricePaid:
            numericPrice.toFixed(2),
        },

        success_url: `${siteUrl}/success?bookingId=${booking.id}`,

        cancel_url: `${siteUrl}/cancel?bookingId=${booking.id}`,
      });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "CHECKOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Checkout failed.",
      },
      {
        status: 500,
      }
    );
  }
}