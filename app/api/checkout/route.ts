import { NextResponse } from "next/server";

import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabase-admin";

import { createCalendarEvent } from "@/lib/createCalendarEvent";

import { sendBookingEmail } from "@/lib/sendBookingEmail";

const stripe = new Stripe(
  process.env
    .STRIPE_SECRET_KEY!,
  {
    apiVersion:
      "2026-04-22.dahlia",
  }
);

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    console.log(
      "CHECKOUT BODY:",
      body
    );

    const {
      service_name,
      price,
      customer_email,
      booking_date,
      booking_time,
      notes,
      timezone,
      client_id,
    } = body;

    if (
      !service_name ||
      !price ||
      !customer_email ||
      !booking_date ||
      !booking_time
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

    const {
      data: existingBooking,
    } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq(
        "booking_date",
        booking_date
      )
      .eq(
        "booking_time",
        booking_time
      )
      .neq(
        "status",
        "cancelled"
      )
      .maybeSingle();

    if (existingBooking) {
      return NextResponse.json(
        {
          error:
            "This time slot has already been booked.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: booking,
      error: bookingError,
    } =
      await supabaseAdmin
        .from("bookings")
        .insert({
          customer_email,

          booking_date,

          booking_time,

          payment_status:
            "pending",

          status: "pending",

          notes,

          timezone,

          client_id,
        })
        .select()
        .single();

    if (
      bookingError ||
      !booking
    ) {
      console.error(
        "BOOKING ERROR:",
        bookingError
      );

      return NextResponse.json(
        {
          error:
            "Failed to create booking",
        },
        {
          status: 500,
        }
      );
    }

    await supabaseAdmin
      .from("availability")
      .delete()
      .eq(
        "available_date",
        booking_date
      )
      .eq(
        "available_time",
        booking_time
      );

    let meetingLink =
      null;

    try {
      meetingLink =
        await createCalendarEvent({
          customerEmail:
            customer_email,

          bookingDate:
            booking_date,

          bookingTime:
            booking_time,

          timezone,
        });

      console.log(
        "MEETING LINK:",
        meetingLink
      );

      if (meetingLink) {
        await supabaseAdmin
          .from("bookings")
          .update({
            meeting_link:
              meetingLink,
          })
          .eq(
            "id",
            booking.id
          );
      }
    } catch (calendarError) {
      console.error(
        "CALENDAR ERROR:",
        calendarError
      );
    }

    sendBookingEmail({
      customerEmail:
        customer_email,

      bookingDate:
        booking_date,

      bookingTime:
        booking_time,

      timezone,

      meetingLink,
    }).catch((error) => {
      console.error(
        "EMAIL ERROR:",
        error
      );
    });

    try {
      console.log(
        "CREATING STRIPE SESSION"
      );

      const session =
        await stripe.checkout.sessions.create(
          {
            payment_method_types:
              ["card"],

            mode: "payment",

            customer_email,

            line_items: [
              {
                price_data: {
                  currency:
                    "usd",

                  product_data:
                    {
                      name:
                        service_name,
                    },

                  unit_amount:
                    Math.round(
                      price * 100
                    ),
                },

                quantity: 1,
              },
            ],

            metadata: {
              booking_id:
                booking.id.toString(),
            },

            success_url:
              "https://orange-rotary-phone-4q647rrgq9wc5jrq-3000.app.github.dev/success",

            cancel_url:
              "https://orange-rotary-phone-4q647rrgq9wc5jrq-3000.app.github.dev/cancel",
          }
        );

      console.log(
        "SESSION URL:",
        session.url
      );

      return NextResponse.json({
        url: session.url,
      });
    } catch (stripeError) {
      console.error(
        "STRIPE ERROR:",
        stripeError
      );

      return NextResponse.json(
        {
          error:
            "Stripe checkout failed",
        },
        {
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error(
      "CHECKOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}