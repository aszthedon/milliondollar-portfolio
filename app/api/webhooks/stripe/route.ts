import Stripe from "stripe";

import { createClient }
from "@supabase/supabase-js";

import { sendBookingEmail }
from "@/lib/sendBookingEmail";

import { createCalendarEvent }
from "@/lib/createCalendarEvent";

const stripe =
  new Stripe(
    process.env
      .STRIPE_SECRET_KEY as string
  );

const endpointSecret =
  process.env
    .STRIPE_WEBHOOK_SECRET as string;

const supabase =
  createClient(
    process.env
      .NEXT_PUBLIC_SUPABASE_URL as string,

    process.env
      .SUPABASE_SERVICE_ROLE_KEY as string
  );

export async function POST(
  request: Request
) {
  const body =
    await request.text();

  const signature =
    request.headers.get(
      "stripe-signature"
    ) as string;

  let event:
    Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        body,
        signature,
        endpointSecret
      );
  } catch (err) {
    console.error(
      "Webhook signature verification failed.",
      err
    );

    return new Response(
      "Webhook Error",
      {
        status: 400,
      }
    );
  }

  if (
    event.type ===
    "checkout.session.completed"
  ) {
    const session =
      event.data
        .object as Stripe.Checkout.Session;

    const bookingId =
      session.metadata
        ?.bookingId;

    if (!bookingId) {
      return new Response(
        "Missing booking ID",
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
      return new Response(
        "Booking missing",
        {
          status: 404,
        }
      );
    }

    let meetingLink =
      null;

    let calendarEventId =
      null;

    const calendarResult =
      await createCalendarEvent({
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

    meetingLink =
      calendarResult
        .meetingLink;

    calendarEventId =
      calendarResult
        .calendarEventId;

    await supabase
      .from("bookings")
      .update({
        payment_status:
          "paid",

        status:
          "confirmed",

        meeting_link:
          meetingLink,

        calendar_event_id:
          calendarEventId,
      })
      .eq(
        "id",
        bookingId
      );

    await sendBookingEmail({
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

      meetingLink,
    });

    console.log(
      "BOOKING CONFIRMED:",
      bookingId
    );
  }

  if (
    event.type ===
    "checkout.session.expired"
  ) {
    const session =
      event.data
        .object as Stripe.Checkout.Session;

    const bookingId =
      session.metadata
        ?.bookingId;

    if (!bookingId) {
      return new Response(
        "Success",
        {
          status: 200,
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
      booking.data
    ) {
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
        .from("bookings")
        .update({
          payment_status:
            "failed",

          status:
            "cancelled",
        })
        .eq(
          "id",
          bookingId
        );
    }
  }

  return new Response(
    "Success",
    {
      status: 200,
    }
  );
}